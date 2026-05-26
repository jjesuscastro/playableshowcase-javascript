const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { insertAd } = require('../db');
const { parseTitle } = require('../utils/parseTitle');

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '..', '..', 'uploads');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, _file, cb) => cb(null, `${crypto.randomUUID()}.html`),
});

const upload = multer({
  storage,
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

router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const html = fs.readFileSync(req.file.path, 'utf8');
  const extractedTitle = parseTitle(html);
  const id = path.basename(req.file.filename, '.html');

  const ad = insertAd({
    id,
    filename: req.file.filename,
    title: req.body.title || extractedTitle || req.file.originalname.replace(/\.html$/i, ''),
    appId: req.body.appId || null,
    tags: req.body.tags ? JSON.parse(req.body.tags) : [],
    developer: req.body.developer || '',
    repo: req.body.repo || '',
    branch: req.body.branch || '',
    notes: req.body.notes || '',
  });

  res.status(201).json(ad);
});

module.exports = router;
