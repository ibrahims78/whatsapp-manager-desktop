import qrcode from 'qrcode';
import path from 'path';
import { existsSync, mkdirSync, rmSync } from 'fs';
import type { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { Boom } from '@hapi/boom';
import { db, whatsappSessionsTable, messagesTable, markDirty } from '../db';
import { eq } from 'drizzle-orm';
import { verifyToken } from './auth';
import { logger } from './logger';
import fetch from 'node-fetch';
import crypto from 'crypto';
import pino from 'pino';

// Baileys is ESM-only. TypeScript compiles `import()` to `require()` in CJS output,
// which breaks ESM packages. Use `new Function` to emit a genuine runtime import().
type BaileysModule = typeof import('@whiskeysockets/baileys');
let _baileys: BaileysModule | null = null;
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const _esmImport = new Function('m', 'return import(m)') as (m: string) => Promise<BaileysModule>;
async function getBaileys(): Promise<BaileysModule> {
  if (!_baileys) {
    _baileys = await _esmImport('@whiskeysockets/baileys');
  }
  return _baileys;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WASocket = any;

type SessionStatus = 'connected' | 'disconnected' | 'connecting' | 'qr_ready' | 'error';

interface SessionEntry {
  socket: WASocket | null;
  status: SessionStatus;
  qrCode: string | null;
  phoneNumber: string | null;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
}

const sessions = new Map<string, SessionEntry>();
let io: SocketIOServer | null = null;

const TOKENS_DIR =
  process.env.NODE_ENV === 'production'
    ? path.join(path.dirname(process.execPath), 'wa-tokens')
    : path.join(process.cwd(), 'wa-tokens');

if (!existsSync(TOKENS_DIR)) mkdirSync(TOKENS_DIR, { recursive: true });

const silentLogger = pino({ level: 'silent' });

function dbUpdate(sessionId: string, values: Record<string, unknown>): void {
  (db.update(whatsappSessionsTable)
    .set({ ...values, updatedAt: new Date().toISOString() } as Parameters<
      ReturnType<typeof db.update>['set']
    >[0])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .where(eq(whatsappSessionsTable.id, sessionId)) as any).run();
  markDirty();
}

function emitToAll(event: string, data: unknown): void {
  if (io) io.emit(event, data);
}

export function initSocketServer(httpServer: HttpServer): void {
  io = new SocketIOServer(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    pingTimeout: 60_000,
    pingInterval: 25_000,
  });

  io.use((socket: WASocket, next: (err?: Error) => void) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('Authentication required'));
    const payload = verifyToken(token);
    if (!payload) return next(new Error('Invalid token'));
    socket.data.user = payload;
    next();
  });

  io.on('connection', (socket: WASocket) => {
    logger.info({ socketId: socket.id }, 'WebSocket client connected');

    sessions.forEach((entry, sessionId) => {
      socket.emit('session_status', { sessionId, status: entry.status, phoneNumber: entry.phoneNumber });
      if (entry.qrCode && entry.status === 'qr_ready') {
        socket.emit('qr', { sessionId, qr: entry.qrCode });
      }
    });

    socket.on('disconnect', () => {
      logger.info({ socketId: socket.id }, 'WebSocket client disconnected');
    });
  });

  setInterval(() => {
    if (io) io.emit('ping', { ts: Date.now() });
  }, 30_000);
}

async function sendWebhook(
  webhookUrl: string,
  payload: Record<string, unknown>,
  webhookSecret?: string
): Promise<void> {
  try {
    const body = JSON.stringify(payload);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (webhookSecret) {
      const sig = crypto.createHmac('sha256', webhookSecret).update(body).digest('hex');
      headers['X-WM-Signature'] = sig;
    }
    await fetch(webhookUrl, { method: 'POST', headers, body });
  } catch (err) {
    logger.warn({ webhookUrl, err }, 'Webhook delivery failed');
  }
}

export async function connectSession(sessionId: string): Promise<void> {
  const existing = sessions.get(sessionId);
  if (existing?.status === 'connected' || existing?.status === 'connecting') return;

  const entry: SessionEntry = {
    socket: null,
    status: 'connecting',
    qrCode: null,
    phoneNumber: null,
    reconnectTimer: null,
  };
  sessions.set(sessionId, entry);

  dbUpdate(sessionId, { status: 'connecting' });
  emitToAll('session_status', { sessionId, status: 'connecting' });

  try {
    // Load baileys dynamically (ESM)
    const {
      default: makeWASocket,
      DisconnectReason,
      useMultiFileAuthState,
      fetchLatestBaileysVersion,
      makeCacheableSignalKeyStore,
    } = await getBaileys();

    const authDir = path.join(TOKENS_DIR, sessionId);
    if (!existsSync(authDir)) mkdirSync(authDir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      logger: silentLogger,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, silentLogger),
      },
      generateHighQualityLinkPreview: false,
      printQRInTerminal: false,
    });

    entry.socket = sock;

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update: Record<string, unknown>) => {
      const { connection, lastDisconnect, qr } = update as {
        connection?: string;
        lastDisconnect?: { error?: unknown };
        qr?: string;
      };

      if (qr) {
        try {
          const qrImage = await qrcode.toDataURL(qr);
          entry.qrCode = qrImage;
          entry.status = 'qr_ready';
          dbUpdate(sessionId, { status: 'qr_ready', qrCode: qrImage });
          emitToAll('qr', { sessionId, qr: qrImage });
          emitToAll('session_status', { sessionId, status: 'qr_ready' });
        } catch (err) {
          logger.error({ err }, 'QR image generation failed');
        }
      }

      if (connection === 'open') {
        const phone = sock.user?.id?.split(':')[0] || null;
        entry.status = 'connected';
        entry.phoneNumber = phone;
        entry.qrCode = null;
        dbUpdate(sessionId, {
          status: 'connected',
          phoneNumber: phone,
          qrCode: null,
          lastConnectedAt: new Date().toISOString(),
        });
        emitToAll('session_status', { sessionId, status: 'connected', phoneNumber: phone });
        logger.info({ sessionId, phone }, 'Session ready');
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        logger.info({ sessionId, statusCode, shouldReconnect }, 'Connection closed');
        entry.status = 'disconnected';
        entry.phoneNumber = null;
        entry.qrCode = null;
        dbUpdate(sessionId, { status: 'disconnected', qrCode: null });
        emitToAll('session_status', { sessionId, status: 'disconnected' });

        if (!shouldReconnect) {
          // WhatsApp revoked the session — clear stored credentials so next
          // connect attempt starts fresh with a new QR scan instead of reusing
          // the revoked credentials and immediately getting 401 again.
          const authDir = path.join(TOKENS_DIR, sessionId);
          if (existsSync(authDir)) {
            try { rmSync(authDir, { recursive: true, force: true }); } catch { /* ignore */ }
          }
        }

        if (shouldReconnect) scheduleReconnect(sessionId);
      }
    });

    sock.ev.on('messages.upsert', async ({ messages: msgs }: { messages: WASocket[] }) => {
      for (const msg of msgs) {
        if (!msg.message || msg.key.fromMe) continue;
        const from = msg.key.remoteJid || '';
        const text =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          '';

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (db.insert(messagesTable).values({
          sessionId,
          direction: 'in',
          type: 'text',
          from_: from,
          to_: sock.user?.id || '',
          content: text,
          mediaUrl: null,
        }) as any).run();
        markDirty();

        emitToAll('message', { sessionId, from, text, timestamp: msg.messageTimestamp });

        const [sessionRow] = db
          .select({
            webhookUrl: whatsappSessionsTable.webhookUrl,
            webhookEvents: whatsappSessionsTable.webhookEvents,
          })
          .from(whatsappSessionsTable)
          .where(eq(whatsappSessionsTable.id, sessionId))
          .all();

        if (sessionRow?.webhookUrl) {
          const events: string[] = JSON.parse(sessionRow.webhookEvents || '[]');
          if (events.includes('message') || events.length === 0) {
            await sendWebhook(sessionRow.webhookUrl, {
              event: 'message',
              sessionId,
              message: { from, text, timestamp: msg.messageTimestamp },
            });
          }
        }
      }
    });
  } catch (err) {
    logger.error({ sessionId, err }, 'Client initialize failed');
    entry.status = 'error';
    dbUpdate(sessionId, { status: 'error' });
    emitToAll('session_status', { sessionId, status: 'error' });
    scheduleReconnect(sessionId);
  }
}

function scheduleReconnect(sessionId: string): void {
  const entry = sessions.get(sessionId);
  if (!entry) return;
  if (entry.reconnectTimer) clearTimeout(entry.reconnectTimer);
  entry.reconnectTimer = setTimeout(async () => {
    logger.info({ sessionId }, 'Attempting reconnect...');
    await connectSession(sessionId);
  }, 30_000);
}

export async function disconnectSession(sessionId: string): Promise<void> {
  const entry = sessions.get(sessionId);
  if (entry) {
    if (entry.reconnectTimer) clearTimeout(entry.reconnectTimer);
    if (entry.socket) {
      try { await entry.socket.logout(); } catch { /* ignore */ }
      try { entry.socket.end(undefined); } catch { /* ignore */ }
      entry.socket = null;
    }
    entry.status = 'disconnected';
    entry.phoneNumber = null;
  }
  dbUpdate(sessionId, { status: 'disconnected' });
  emitToAll('session_status', { sessionId, status: 'disconnected' });
}

export function getSessionStatus(sessionId: string): {
  status: SessionStatus;
  phoneNumber: string | null;
  qrCode: string | null;
} {
  const entry = sessions.get(sessionId);
  if (!entry) return { status: 'disconnected', phoneNumber: null, qrCode: null };
  return { status: entry.status, phoneNumber: entry.phoneNumber, qrCode: entry.qrCode };
}

export function getSessionSocket(sessionId: string): WASocket | null {
  return sessions.get(sessionId)?.socket || null;
}

export async function restoreActiveSessions(): Promise<void> {
  const allSessions = db.select().from(whatsappSessionsTable).all();
  for (const s of allSessions) {
    const authDir = path.join(TOKENS_DIR, s.id);
    const hasCredentials = existsSync(path.join(authDir, 'creds.json'));

    // Restore if the DB says connected, OR if stored credentials exist (device still
    // linked on the phone but server was restarted / crashed mid-session).
    if (s.status === 'connected' || hasCredentials) {
      logger.info({ sessionId: s.id, reason: s.status === 'connected' ? 'db_connected' : 'stored_creds' }, 'Restoring session...');
      connectSession(s.id).catch((err) =>
        logger.error({ sessionId: s.id, err }, 'Failed to restore')
      );
    }
  }
}

export async function shutdownAllSessions(): Promise<void> {
  const ids = Array.from(sessions.keys());
  await Promise.allSettled(ids.map(disconnectSession));
}

async function resolveJid(sock: ReturnType<BaileysModule['makeWASocket']>, number: string): Promise<string> {
  const clean = number.replace(/\D/g, '');
  const results = await (sock as any).onWhatsApp(clean);
  if (!results || results.length === 0 || !results[0].exists) {
    throw new Error(`Number ${clean} is not registered on WhatsApp`);
  }
  return results[0].jid as string;
}

export async function sendTextMessage(sessionId: string, number: string, text: string): Promise<void> {
  const sock = getSessionSocket(sessionId);
  if (!sock) throw new Error('Session not connected');
  const jid = await resolveJid(sock as any, number);
  await sock.sendMessage(jid, { text });
}

export async function sendMediaMessage(
  sessionId: string,
  number: string,
  type: 'image' | 'video' | 'audio' | 'document',
  data: Buffer,
  mimeType: string,
  filename?: string,
  caption?: string
): Promise<void> {
  const sock = getSessionSocket(sessionId);
  if (!sock) throw new Error('Session not connected');
  const jid = await resolveJid(sock as any, number);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const msgContent: any =
    type === 'image'
      ? { image: data, caption, mimetype: mimeType }
      : type === 'video'
        ? { video: data, caption, mimetype: mimeType }
        : type === 'audio'
          ? { audio: data, mimetype: mimeType, ptt: false }
          : { document: data, mimetype: mimeType, fileName: filename };

  await sock.sendMessage(jid, msgContent);
}
