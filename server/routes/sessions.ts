import { Router } from 'express';
import { db, whatsappSessionsTable, messagesTable, markDirty } from '../db';
import { eq, desc } from 'drizzle-orm';
import { requireApiKeyOrAuth } from '../lib/auth';
import { connectSession, disconnectSession, getSessionStatus } from '../lib/whatsapp-manager';
// getSessionSocket exported but not needed directly in this router
import { addAuditLog } from '../lib/audit';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const run = (q: any) => { (q as any).run(); markDirty(); };

router.get('/', requireApiKeyOrAuth, (_req, res) => {
  const rows = db.select().from(whatsappSessionsTable).all();
  const sessions = rows.map((s) => {
    const live = getSessionStatus(s.id);
    return { ...s, ...live };
  });
  res.json({ sessions });
});

router.post('/', requireApiKeyOrAuth, async (req, res) => {
  const { id, name } = req.body as { id?: string; name?: string };
  if (!name) {
    res.status(400).json({ error: 'Session name is required' });
    return;
  }

  const sessionId = id || uuidv4();

  const existing = db
    .select({ id: whatsappSessionsTable.id })
    .from(whatsappSessionsTable)
    .where(eq(whatsappSessionsTable.id, sessionId))
    .all();

  if (existing.length > 0) {
    res.status(409).json({ error: 'Session ID already exists' });
    return;
  }

  run(db.insert(whatsappSessionsTable).values({ id: sessionId, name }));
  await addAuditLog(req.user!.userId, 'session.create', { sessionId, name });

  const [session] = db
    .select()
    .from(whatsappSessionsTable)
    .where(eq(whatsappSessionsTable.id, sessionId))
    .all();

  res.status(201).json({ session });
});

router.get('/:id', requireApiKeyOrAuth, (req, res) => {
  const [session] = db
    .select()
    .from(whatsappSessionsTable)
    .where(eq(whatsappSessionsTable.id, req.params.id))
    .all();

  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  const live = getSessionStatus(req.params.id);
  res.json({ session: { ...session, ...live } });
});

router.delete('/:id', requireApiKeyOrAuth, async (req, res) => {
  const [session] = db
    .select({ id: whatsappSessionsTable.id })
    .from(whatsappSessionsTable)
    .where(eq(whatsappSessionsTable.id, req.params.id))
    .all();

  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  await disconnectSession(req.params.id);
  run(db.delete(messagesTable).where(eq(messagesTable.sessionId, req.params.id)));
  run(db.delete(whatsappSessionsTable).where(eq(whatsappSessionsTable.id, req.params.id)));
  await addAuditLog(req.user!.userId, 'session.delete', { sessionId: req.params.id });

  res.json({ success: true });
});

router.post('/:id/connect', requireApiKeyOrAuth, async (req, res) => {
  const [session] = db
    .select({ id: whatsappSessionsTable.id })
    .from(whatsappSessionsTable)
    .where(eq(whatsappSessionsTable.id, req.params.id))
    .all();

  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  connectSession(req.params.id).catch(() => { /* handled inside */ });
  await addAuditLog(req.user!.userId, 'session.connect', { sessionId: req.params.id });

  res.json({ success: true, message: 'Connection initiated. Monitor via WebSocket for QR code.' });
});

router.post('/:id/disconnect', requireApiKeyOrAuth, async (req, res) => {
  await disconnectSession(req.params.id);
  await addAuditLog(req.user!.userId, 'session.disconnect', { sessionId: req.params.id });
  res.json({ success: true });
});

router.get('/:id/qr', requireApiKeyOrAuth, (req, res) => {
  const live = getSessionStatus(req.params.id);
  if (!live.qrCode) {
    res.status(404).json({ error: 'No QR code available. Initiate connection first.' });
    return;
  }
  res.json({ qr: live.qrCode });
});

router.get('/:id/messages', requireApiKeyOrAuth, (req, res) => {
  const page = parseInt((req.query.page as string) || '1', 10);
  const limit = Math.min(parseInt((req.query.limit as string) || '50', 10), 200);
  const offset = (page - 1) * limit;

  const messages = db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.sessionId, req.params.id))
    .orderBy(desc(messagesTable.id))
    .limit(limit)
    .offset(offset)
    .all();

  res.json({ messages, page, limit });
});

router.get('/:id/stats', requireApiKeyOrAuth, (req, res) => {
  const total = db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.sessionId, req.params.id))
    .all();

  const sent = total.filter((m) => m.direction === 'out').length;
  const received = total.filter((m) => m.direction === 'in').length;

  res.json({ total: total.length, sent, received });
});

router.patch('/:id/webhook', requireApiKeyOrAuth, async (req, res) => {
  const { webhookUrl, events } = req.body as { webhookUrl?: string; events?: string[] };

  run(
    db.update(whatsappSessionsTable)
      .set({
        webhookUrl: webhookUrl || null,
        webhookEvents: JSON.stringify(events || []),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(whatsappSessionsTable.id, req.params.id))
  );

  await addAuditLog(req.user!.userId, 'session.webhook_update', { sessionId: req.params.id, webhookUrl });
  res.json({ success: true });
});

router.patch('/:id/features', requireApiKeyOrAuth, (req, res) => {
  const { features } = req.body as { features?: Record<string, unknown> };

  run(
    db.update(whatsappSessionsTable)
      .set({
        features: JSON.stringify(features || {}),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(whatsappSessionsTable.id, req.params.id))
  );

  res.json({ success: true });
});

export default router;
