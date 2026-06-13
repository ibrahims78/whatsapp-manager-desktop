import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db, usersTable, apiKeysTable } from '../db';
import { eq } from 'drizzle-orm';
import type { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production-use-random-secret';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

export interface JwtPayload {
  userId: number;
  username: string;
  role: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const raw = 'wm_' + crypto.randomBytes(24).toString('hex');
  const prefix = raw.slice(0, 11);
  const hash = hashApiKey(raw);
  return { key: raw, prefix, hash };
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token =
    req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : (req.cookies as Record<string, string>)?.session_token;

  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  req.user = payload;
  next();
}

export async function requireApiKeyOrAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const apiKey = req.headers['x-api-key'] as string | undefined;

  if (apiKey) {
    const hash = hashApiKey(apiKey);
    const [keyRow] = db
      .select({ id: apiKeysTable.id, userId: apiKeysTable.userId })
      .from(apiKeysTable)
      .where(eq(apiKeysTable.keyHash, hash))
      .all();

    if (keyRow) {
      db.update(apiKeysTable)
        .set({ lastUsedAt: new Date().toISOString() })
        .where(eq(apiKeysTable.id, keyRow.id))
        .run();

      const [user] = db
        .select({ id: usersTable.id, username: usersTable.username, role: usersTable.role })
        .from(usersTable)
        .where(eq(usersTable.id, keyRow.userId))
        .all();

      if (user) {
        req.user = { userId: user.id, username: user.username, role: user.role };
        next();
        return;
      }
    }

    res.status(401).json({ error: 'Invalid API key' });
    return;
  }

  return requireAuth(req, res, next);
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}
