import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db, messagesTable, markDirty } from '../db';
import { requireApiKeyOrAuth } from '../lib/auth';
import { sendTextMessage, sendMediaMessage } from '../lib/whatsapp-manager';

const router = Router();

const uploadDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 64 * 1024 * 1024 },
});

function logMessage(
  sessionId: string,
  to: string,
  type: string,
  content?: string | null,
  mediaUrl?: string | null
): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (db.insert(messagesTable).values({
    sessionId,
    direction: 'out',
    type,
    to_: to,
    content: content || null,
    mediaUrl: mediaUrl || null,
  }) as any).run();
  markDirty();
}

router.post('/:id/send/text', requireApiKeyOrAuth, async (req, res) => {
  const { number, text } = req.body as { number?: string; text?: string };
  if (!number || !text) {
    res.status(400).json({ error: 'number and text are required' });
    return;
  }
  try {
    await sendTextMessage(req.params.id, number, text);
    logMessage(req.params.id, number, 'text', text);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post('/:id/send/image', requireApiKeyOrAuth, upload.single('file'), async (req, res) => {
  const { number, imageUrl, caption } = req.body as { number?: string; imageUrl?: string; caption?: string };
  if (!number) { res.status(400).json({ error: 'number is required' }); return; }

  try {
    let data: Buffer;
    let mimeType = 'image/jpeg';

    if (req.file) {
      data = fs.readFileSync(req.file.path);
      mimeType = req.file.mimetype || 'image/jpeg';
      fs.unlinkSync(req.file.path);
    } else if (imageUrl) {
      const fetch = (await import('node-fetch')).default;
      const resp = await fetch(imageUrl);
      data = Buffer.from(await resp.arrayBuffer());
      mimeType = resp.headers.get('content-type') || 'image/jpeg';
    } else {
      res.status(400).json({ error: 'imageUrl or file is required' }); return;
    }

    await sendMediaMessage(req.params.id, number, 'image', data, mimeType, undefined, caption);
    logMessage(req.params.id, number, 'image', caption, imageUrl);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post('/:id/send/video', requireApiKeyOrAuth, upload.single('file'), async (req, res) => {
  const { number, videoUrl, caption } = req.body as { number?: string; videoUrl?: string; caption?: string };
  if (!number) { res.status(400).json({ error: 'number is required' }); return; }

  try {
    let data: Buffer;
    let mimeType = 'video/mp4';

    if (req.file) {
      data = fs.readFileSync(req.file.path);
      mimeType = req.file.mimetype || 'video/mp4';
      fs.unlinkSync(req.file.path);
    } else if (videoUrl) {
      const fetch = (await import('node-fetch')).default;
      const resp = await fetch(videoUrl);
      data = Buffer.from(await resp.arrayBuffer());
      mimeType = resp.headers.get('content-type') || 'video/mp4';
    } else {
      res.status(400).json({ error: 'videoUrl or file is required' }); return;
    }

    await sendMediaMessage(req.params.id, number, 'video', data, mimeType, undefined, caption);
    logMessage(req.params.id, number, 'video', caption, videoUrl);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post('/:id/send/audio', requireApiKeyOrAuth, upload.single('file'), async (req, res) => {
  const { number, audioUrl } = req.body as { number?: string; audioUrl?: string };
  if (!number) { res.status(400).json({ error: 'number is required' }); return; }

  try {
    let data: Buffer;
    let mimeType = 'audio/ogg';

    if (req.file) {
      data = fs.readFileSync(req.file.path);
      mimeType = req.file.mimetype || 'audio/ogg';
      fs.unlinkSync(req.file.path);
    } else if (audioUrl) {
      const fetch = (await import('node-fetch')).default;
      const resp = await fetch(audioUrl);
      data = Buffer.from(await resp.arrayBuffer());
      mimeType = resp.headers.get('content-type') || 'audio/ogg';
    } else {
      res.status(400).json({ error: 'audioUrl or file is required' }); return;
    }

    await sendMediaMessage(req.params.id, number, 'audio', data, mimeType);
    logMessage(req.params.id, number, 'audio', null, audioUrl);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post('/:id/send/file', requireApiKeyOrAuth, upload.single('file'), async (req, res) => {
  const { number, fileUrl, filename } = req.body as { number?: string; fileUrl?: string; filename?: string };
  if (!number) { res.status(400).json({ error: 'number is required' }); return; }

  try {
    let data: Buffer;
    let mimeType = 'application/octet-stream';
    let fname = filename || 'file';

    if (req.file) {
      data = fs.readFileSync(req.file.path);
      mimeType = req.file.mimetype || 'application/octet-stream';
      fname = filename || req.file.originalname || 'file';
      fs.unlinkSync(req.file.path);
    } else if (fileUrl) {
      const fetch = (await import('node-fetch')).default;
      const resp = await fetch(fileUrl);
      data = Buffer.from(await resp.arrayBuffer());
      mimeType = resp.headers.get('content-type') || 'application/octet-stream';
    } else {
      res.status(400).json({ error: 'fileUrl or file is required' }); return;
    }

    await sendMediaMessage(req.params.id, number, 'document', data, mimeType, fname);
    logMessage(req.params.id, number, 'file', fname, fileUrl);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
