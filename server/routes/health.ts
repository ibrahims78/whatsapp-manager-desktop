import { Router } from 'express';

const router = Router();

router.get('/healthz', (_req, res) => {
  res.json({ status: 'ok', service: 'whatsapp-manager-desktop', ts: Date.now() });
});

export default router;
