import { Router } from 'express';
import { db, whatsappSessionsTable, messagesTable, usersTable } from '../db';
import { sql, gte } from 'drizzle-orm';
import { requireApiKeyOrAuth } from '../lib/auth';

const router = Router();

router.get('/stats', requireApiKeyOrAuth, (_req, res) => {
  const sessions = db.select().from(whatsappSessionsTable).all();
  const totalSessions = sessions.length;
  const activeSessions = sessions.filter((s) => s.status === 'connected').length;

  const totalMessages = db.select().from(messagesTable).all().length;

  const totalUsers = db.select({ id: usersTable.id }).from(usersTable).all().length;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const recentMessages = db
    .select()
    .from(messagesTable)
    .where(gte(messagesTable.timestamp, sevenDaysAgo))
    .all();

  const chart: Record<string, { sent: number; received: number }> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().split('T')[0];
    chart[key] = { sent: 0, received: 0 };
  }

  for (const msg of recentMessages) {
    const day = (msg.timestamp || '').split('T')[0];
    if (chart[day]) {
      if (msg.direction === 'out') chart[day].sent++;
      else chart[day].received++;
    }
  }

  const chartData = Object.entries(chart).map(([date, counts]) => ({ date, ...counts }));

  res.json({
    totalSessions,
    activeSessions,
    totalMessages,
    totalUsers,
    chart: chartData,
  });
});

export default router;
