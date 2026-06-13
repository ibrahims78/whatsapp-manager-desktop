import { db, auditLogsTable } from '../db';

export async function addAuditLog(
  userId: number | null,
  action: string,
  details: Record<string, unknown> = {}
): Promise<void> {
  try {
    db.insert(auditLogsTable).values({
      userId: userId ?? undefined,
      action,
      details: JSON.stringify(details),
    }).run();
  } catch (err) {
    console.error('[audit] Failed to write audit log:', err);
  }
}
