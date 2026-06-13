import { Router } from 'express';
import { requireApiKeyOrAuth } from '../lib/auth';
import fetch from 'node-fetch';

const router = Router();

const N8N_BASE_URL = process.env.N8N_BASE_URL || 'http://localhost:5678';
const N8N_API_KEY = process.env.N8N_API_KEY || '';

router.get('/workflows', requireApiKeyOrAuth, async (_req, res) => {
  if (!N8N_API_KEY) {
    res.json({ workflows: [], message: 'N8N_API_KEY not configured' });
    return;
  }
  try {
    const resp = await fetch(`${N8N_BASE_URL}/api/v1/workflows`, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY },
    });
    const data = await resp.json() as { data?: unknown[] };
    res.json({ workflows: data.data || [] });
  } catch {
    res.status(502).json({ error: 'Could not reach n8n' });
  }
});

router.post('/trigger', requireApiKeyOrAuth, async (req, res) => {
  const { webhookUrl, payload } = req.body as { webhookUrl?: string; payload?: unknown };
  if (!webhookUrl) {
    res.status(400).json({ error: 'webhookUrl is required' });
    return;
  }

  try {
    const resp = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {}),
    });
    const data = await resp.json();
    res.json({ success: true, response: data });
  } catch (err) {
    res.status(502).json({ error: String(err) });
  }
});

export default router;
