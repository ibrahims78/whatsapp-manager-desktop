import { Router } from 'express';
import { compareSync, hashSync } from 'bcryptjs';
import { db, usersTable } from '../db';
import { eq } from 'drizzle-orm';
import { signToken, requireAuth } from '../lib/auth';
import { addAuditLog } from '../lib/audit';
import { authRateLimiter } from '../lib/rate-limit';

const router = Router();

router.post('/login', authRateLimiter, async (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password required' });
    return;
  }

  const [user] = db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username.trim()))
    .all();

  if (!user || !compareSync(password, user.password)) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = signToken({ userId: user.id, username: user.username, role: user.role });

  res.cookie('session_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  await addAuditLog(user.id, 'auth.login', { username: user.username });

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    },
  });
});

router.get('/me', requireAuth, (req, res) => {
  const [user] = db
    .select({ id: usersTable.id, username: usersTable.username, role: usersTable.role, mustChangePassword: usersTable.mustChangePassword })
    .from(usersTable)
    .where(eq(usersTable.id, req.user!.userId))
    .all();

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({ user });
});

router.post('/logout', requireAuth, async (req, res) => {
  await addAuditLog(req.user!.userId, 'auth.logout', {});
  res.clearCookie('session_token');
  res.json({ success: true });
});

export default router;
