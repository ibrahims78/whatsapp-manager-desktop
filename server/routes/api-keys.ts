import { Router } from 'express';
import { db, apiKeysTable } from '../db';
import { eq } from 'drizzle-orm';
import { requireAuth, generateApiKey } from '../lib/auth';
import { addAuditLog } from '../lib/audit';

const router = Router();

router.get('/', requireAuth, (_req, res) => {
  const keys = db
    .select({ id: apiKeysTable.id, name: apiKeysTable.name, prefix: apiKeysTable.prefix, lastUsedAt: apiKeysTable.lastUsedAt, createdAt: apiKeysTable.createdAt })
    .from(apiKeysTable)
    .where(eq(apiKeysTable.userId, _req.user!.userId))
    .all();
  res.json({ keys });
});

router.post('/', requireAuth, async (req, res) => {
  const { name } = req.body as { name?: string };
  if (!name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const { key, prefix, hash } = generateApiKey();

  db.insert(apiKeysTable).values({
    userId: req.user!.userId,
    name,
    keyHash: hash,
    prefix,
  }).run();

  await addAuditLog(req.user!.userId, 'apikey.create', { name, prefix });

  res.status(201).json({ key, prefix, name, message: 'Save this key — it will not be shown again.' });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const keyId = parseInt(req.params.id, 10);

  const [key] = db
    .select({ id: apiKeysTable.id, userId: apiKeysTable.userId })
    .from(apiKeysTable)
    .where(eq(apiKeysTable.id, keyId))
    .all();

  if (!key) {
    res.status(404).json({ error: 'Key not found' });
    return;
  }

  if (key.userId !== req.user!.userId && req.user!.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  db.delete(apiKeysTable).where(eq(apiKeysTable.id, keyId)).run();

  await addAuditLog(req.user!.userId, 'apikey.delete', { keyId });

  res.json({ success: true });
});

export default router;
