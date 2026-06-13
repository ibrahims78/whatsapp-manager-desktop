import { Router } from 'express';
import { hashSync } from 'bcryptjs';
import { db, usersTable } from '../db';
import { eq } from 'drizzle-orm';
import { requireAuth, requireAdmin } from '../lib/auth';
import { addAuditLog } from '../lib/audit';

const router = Router();

router.get('/', requireAuth, requireAdmin, (_req, res) => {
  const users = db
    .select({ id: usersTable.id, username: usersTable.username, role: usersTable.role, mustChangePassword: usersTable.mustChangePassword, createdAt: usersTable.createdAt })
    .from(usersTable)
    .all();
  res.json({ users });
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { username, password, role } = req.body as { username?: string; password?: string; role?: string };
  if (!username || !password) {
    res.status(400).json({ error: 'username and password are required' });
    return;
  }

  const existing = db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.username, username)).all();
  if (existing.length > 0) {
    res.status(409).json({ error: 'Username already exists' });
    return;
  }

  db.insert(usersTable).values({
    username,
    password: hashSync(password, 12),
    role: role === 'admin' ? 'admin' : 'employee',
    mustChangePassword: true,
  }).run();

  const [user] = db.select({ id: usersTable.id, username: usersTable.username, role: usersTable.role }).from(usersTable).where(eq(usersTable.username, username)).all();

  await addAuditLog(req.user!.userId, 'user.create', { targetUsername: username, role });

  res.status(201).json({ user });
});

router.patch('/:id', requireAuth, async (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  const isAdmin = req.user!.role === 'admin';
  const isSelf = req.user!.userId === targetId;

  if (!isAdmin && !isSelf) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const { password, role, mustChangePassword } = req.body as { password?: string; role?: string; mustChangePassword?: boolean };
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

  if (password) updates.password = hashSync(password, 12);
  if (role && isAdmin) updates.role = role === 'admin' ? 'admin' : 'employee';
  if (mustChangePassword !== undefined && isAdmin) updates.mustChangePassword = mustChangePassword;
  if (isSelf && password) updates.mustChangePassword = false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db.update(usersTable).set(updates as any).where(eq(usersTable.id, targetId)).run();

  await addAuditLog(req.user!.userId, 'user.update', { targetId });

  res.json({ success: true });
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const targetId = parseInt(req.params.id, 10);

  if (targetId === req.user!.userId) {
    res.status(400).json({ error: 'Cannot delete your own account' });
    return;
  }

  db.delete(usersTable).where(eq(usersTable.id, targetId)).run();

  await addAuditLog(req.user!.userId, 'user.delete', { targetId });

  res.json({ success: true });
});

export default router;
