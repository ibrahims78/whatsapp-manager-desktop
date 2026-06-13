import { Router } from 'express';
import { db, auditLogsTable, usersTable } from '../db';
import { desc, eq } from 'drizzle-orm';
import { requireAuth, requireAdmin } from '../lib/auth';

const router = Router();

router.get('/', requireAuth, requireAdmin, (req, res) => {
  const page = parseInt((req.query.page as string) || '1', 10);
  const limit = Math.min(parseInt((req.query.limit as string) || '50', 10), 200);
  const offset = (page - 1) * limit;

  const logs = db
    .select({
      id: auditLogsTable.id,
      action: auditLogsTable.action,
      details: auditLogsTable.details,
      createdAt: auditLogsTable.createdAt,
      userId: auditLogsTable.userId,
      username: usersTable.username,
    })
    .from(auditLogsTable)
    .leftJoin(usersTable, eq(auditLogsTable.userId, usersTable.id))
    .orderBy(desc(auditLogsTable.id))
    .limit(limit)
    .offset(offset)
    .all();

  res.json({ logs, page, limit });
});

export default router;
