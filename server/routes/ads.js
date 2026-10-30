const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { listAds, getAd, updateAd, updateAdFile, updateAdThumbnail, deleteAd } = require('../db');
const { captureScreenshot, captureScreenshotCandidates } = require('../utils/screenshot');

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '..', '..', 'uploads');

const fileStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, _file, cb) => cb(null, `${crypto.randomUUID()}.html`),
});

const uploadFile = multer({
  storage: fileStorage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/html' || file.originalname.endsWith('.html')) {
      cb(null, true);
    } else {
      cb(new Error('Only .html files are allowed'));
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 },
});

const router = express.Router();

router.get('/', (req, res) => {
  res.json(listAds(req.query.appId));
});

router.get('/:id', (req, res) => {
  const ad = getAd(req.params.id);
  if (!ad) return res.status(404).json({ error: 'Not found' });
  res.json(ad);
});

router.patch('/:id', (req, res) => {
  const existing = getAd(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const { title, appId, tags, developer, repo, branch, notes } = req.body;
  const updated = updateAd(req.params.id, {
    title: title ?? existing.title,
    appId: appId ?? existing.appId ?? null,
    tags: tags ?? existing.tags ?? [],
    developer: developer ?? existing.developer ?? '',
    repo: repo ?? existing.repo ?? '',
    branch: branch ?? existing.branch ?? '',
    notes: notes ?? existing.notes ?? '',
  });
  res.json(updated);
});

router.post('/:id/thumbnail', express.json({ limit: '10mb' }), (req, res) => {
  const ad = getAd(req.params.id);
  if (!ad) return res.status(404).json({ error: 'Not found' });

  const { dataUrl } = req.body;
  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    return res.status(400).json({ error: 'Invalid dataUrl' });
  }

  const thumbFilename = `${req.params.id}-thumb.png`;
  const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  fs.writeFileSync(path.join(UPLOADS_DIR, thumbFilename), Buffer.from(base64Data, 'base64'));

  const updated = updateAdThumbnail(req.params.id, thumbFilename);
  res.json(updated);
});

router.post('/:id/screenshot', async (req, res) => {
  const ad = getAd(req.params.id);
  if (!ad) return res.status(404).json({ error: 'Not found' });

  try {
    const port = process.env.PORT || 3000;
    const url = `http://127.0.0.1:${port}/uploads/${ad.filename}`;
    const buffer = await captureScreenshot(url);

    const thumbFilename = `${req.params.id}-thumb.png`;
    fs.writeFileSync(path.join(UPLOADS_DIR, thumbFilename), buffer);

    const updated = updateAdThumbnail(req.params.id, thumbFilename);
    res.json(updated);
  } catch (err) {
    console.error('Screenshot failed:', err);
    res.status(500).json({ error: 'Screenshot failed', details: err.message });
  }
});

router.post('/:id/screenshot-candidates', async (req, res) => {
  const ad = getAd(req.params.id);
  if (!ad) return res.status(404).json({ error: 'Not found' });

  try {
    const port = process.env.PORT || 3000;
    const url = `http://127.0.0.1:${port}/uploads/${ad.filename}`;
    const buffers = await captureScreenshotCandidates(url);
    const candidates = buffers.map(buf => 'data:image/png;base64,' + buf.toString('base64'));
    res.json({ candidates });
  } catch (err) {
    console.error('Screenshot candidates failed:', err);
    res.status(500).json({ error: 'Screenshot capture failed', details: err.message });
  }
});

router.post('/:id/file', uploadFile.single('file'), (req, res) => {
  const ad = getAd(req.params.id);
  if (!ad) return res.status(404).json({ error: 'Not found' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const oldPath = path.join(UPLOADS_DIR, ad.filename);
  if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);

  const updated = updateAdFile(req.params.id, req.file.filename);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const ad = deleteAd(req.params.id);
  if (!ad) return res.status(404).json({ error: 'Not found' });

  const filePath = path.join(UPLOADS_DIR, ad.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  const thumbPath = path.join(UPLOADS_DIR, `${ad.id}-thumb.png`);
  if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);

  res.status(204).end();
});

module.exports = router;
