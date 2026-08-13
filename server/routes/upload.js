const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const AdmZip = require('adm-zip');
const { parse } = require('csv-parse/sync');
const { insertAd, listApps, deleteAd } = require('../db');
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

const batchUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype === 'application/zip' ||
      file.mimetype === 'application/x-zip-compressed' ||
      file.originalname.endsWith('.zip')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only .zip files are allowed'));
    }
  },
  limits: { fileSize: 200 * 1024 * 1024 },
});

const tableBatchUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/html' || file.originalname.endsWith('.html')) {
      cb(null, true);
    } else {
      cb(new Error('Only .html files are allowed'));
    }
  },
  limits: { fileSize: 50 * 1024 * 1024, files: 100 },
});

const router = express.Router();

const MANIFEST_NAME = 'manifest.csv';
const REQUIRED_HEADERS = ['filename', 'title', 'app', 'tags', 'developer', 'repo', 'branch', 'notes'];

function isRootEntry(name) {
  return name && !name.includes('/') && !name.includes('\\');
}

function normalizeEntryName(name) {
  return name.replace(/\\/g, '/');
}

function normalizeManifestFilename(filename) {
  const trimmed = String(filename || '').trim();
  if (!trimmed) return '';
  return trimmed.toLowerCase().endsWith('.html') ? trimmed : `${trimmed}.html`;
}

function addError(errors, message, row) {
  errors.push(row ? `Row ${row}: ${message}` : message);
}

function parseTags(value) {
  return String(value || '')
    .split(',')
    .map(tag => tag.trim().toLowerCase())
    .filter(Boolean);
}

function parseManifest(csv) {
  return parse(csv, {
    columns: true,
    bom: true,
    skip_empty_lines: true,
    trim: true,
  });
}

function validateManifestHeaders(rows) {
  if (!rows.length) return ['manifest.csv must contain at least one row.'];
  const headers = Object.keys(rows[0]);
  const missing = REQUIRED_HEADERS.filter(header => !headers.includes(header));
  const extra = headers.filter(header => !REQUIRED_HEADERS.includes(header));
  const errors = [];
  if (missing.length) errors.push(`manifest.csv is missing required header(s): ${missing.join(', ')}.`);
  if (extra.length) errors.push(`manifest.csv has unsupported header(s): ${extra.join(', ')}.`);
  return errors;
}

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

router.post('/batch', batchUpload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No zip uploaded' });

  const errors = [];
  let zip;
  try {
    zip = new AdmZip(req.file.buffer);
  } catch {
    return res.status(400).json({ error: 'Invalid zip file' });
  }

  const entries = zip.getEntries().filter(entry => !entry.isDirectory);
  const entryNames = entries.map(entry => normalizeEntryName(entry.entryName));
  const entryNameCounts = new Map();
  for (const name of entryNames) {
    entryNameCounts.set(name, (entryNameCounts.get(name) || 0) + 1);
  }
  for (const [name, count] of entryNameCounts) {
    if (count > 1) addError(errors, `Duplicate zip entry found: ${name}.`);
  }

  const manifestEntry = entries.find(entry => normalizeEntryName(entry.entryName) === MANIFEST_NAME);
  if (!manifestEntry) addError(errors, 'manifest.csv must exist at the zip root.');

  for (const name of entryNames) {
    if (name.toLowerCase().endsWith('.html') && !isRootEntry(name)) {
      addError(errors, `HTML files must be at the zip root: ${name}.`);
    }
  }

  const htmlEntries = entries.filter(entry => {
    const name = normalizeEntryName(entry.entryName);
    return isRootEntry(name) && name.toLowerCase().endsWith('.html');
  });
  if (htmlEntries.length < 2) addError(errors, 'Batch zip must contain at least two root-level .html files.');

  let rows = [];
  if (manifestEntry) {
    try {
      rows = parseManifest(manifestEntry.getData().toString('utf8'));
      errors.push(...validateManifestHeaders(rows));
    } catch (err) {
      addError(errors, `manifest.csv could not be parsed: ${err.message}`);
    }
  }

  const htmlByName = new Map();
  for (const entry of htmlEntries) {
    const name = normalizeEntryName(entry.entryName);
    if (htmlByName.has(name)) addError(errors, `Duplicate HTML file found: ${name}.`);
    htmlByName.set(name, entry);
  }

  const appsByName = new Map(listApps().map(app => [app.name, app]));
  const rowNames = new Set();
  const preparedRows = [];

  rows.forEach((row, idx) => {
    const rowNumber = idx + 2;
    const rawFilename = String(row.filename || '').trim();
    const filename = normalizeManifestFilename(rawFilename);
    const appName = String(row.app || '').trim();

    if (!rawFilename) addError(errors, 'filename is required.', rowNumber);
    if (rawFilename && !isRootEntry(rawFilename)) addError(errors, `filename must be a root-level file name: ${rawFilename}.`, rowNumber);
    if (filename && rowNames.has(filename)) addError(errors, `Duplicate manifest filename: ${filename}.`, rowNumber);
    if (filename) rowNames.add(filename);
    if (filename && !htmlByName.has(filename)) addError(errors, `No matching HTML file found in zip for ${filename}.`, rowNumber);

    const app = appsByName.get(appName);
    if (!appName) addError(errors, 'app is required.', rowNumber);
    if (appName && !app) addError(errors, `Unknown app: ${appName}.`, rowNumber);

    if (filename && app) {
      preparedRows.push({
        entry: htmlByName.get(filename),
        originalName: filename,
        title: String(row.title || '').trim(),
        appId: app.id,
        tags: parseTags(row.tags),
        developer: String(row.developer || '').trim(),
        repo: String(row.repo || '').trim(),
        branch: String(row.branch || '').trim(),
        notes: String(row.notes || ''),
      });
    }
  });

  for (const name of htmlByName.keys()) {
    if (!rowNames.has(name)) addError(errors, `HTML file is missing from manifest.csv: ${name}.`);
  }

  if (errors.length) {
    return res.status(400).json({ error: 'Batch validation failed', errors });
  }

  const writtenFiles = [];
  const insertedAds = [];

  try {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });

    for (const row of preparedRows) {
      const id = crypto.randomUUID();
      const filename = `${id}.html`;
      const targetPath = path.join(UPLOADS_DIR, filename);
      const html = row.entry.getData().toString('utf8');
      fs.writeFileSync(targetPath, html, 'utf8');
      writtenFiles.push(targetPath);

      const ad = insertAd({
        id,
        filename,
        title: row.title || parseTitle(html) || row.originalName.replace(/\.html$/i, ''),
        appId: row.appId,
        tags: row.tags,
        developer: row.developer,
        repo: row.repo,
        branch: row.branch,
        notes: row.notes,
      });
      insertedAds.push(ad);
    }

    res.status(201).json({ uploaded: insertedAds.length, ads: insertedAds });
  } catch (err) {
    for (const ad of insertedAds) deleteAd(ad.id);
    for (const filePath of writtenFiles) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    console.error('Batch upload failed:', err.message);
    res.status(500).json({ error: 'Batch upload failed' });
  }
});

router.post('/batch-table', tableBatchUpload.array('files'), (req, res) => {
  const files = req.files || [];
  const errors = [];
  let metadata = [];

  try {
    metadata = JSON.parse(req.body.metadata || '[]');
  } catch {
    errors.push('metadata must be valid JSON.');
  }

  if (files.length < 2) errors.push('Batch upload requires at least two .html files.');
  if (!Array.isArray(metadata)) errors.push('metadata must be an array.');
  if (Array.isArray(metadata) && files.length !== metadata.length) {
    errors.push('Uploaded file count must match metadata row count.');
  }

  const preparedRows = [];
  if (Array.isArray(metadata)) {
    files.forEach((file, idx) => {
      const row = metadata[idx] || {};
      const rowNumber = idx + 1;
      if (!row.appId) errors.push(`Row ${rowNumber}: Application is required.`);
      preparedRows.push({
        file,
        originalName: file.originalname,
        title: String(row.title || '').trim(),
        appId: row.appId || null,
        tags: Array.isArray(row.tags) ? row.tags.map(tag => String(tag).trim().toLowerCase()).filter(Boolean) : [],
        developer: String(row.developer || '').trim(),
        repo: String(row.repo || '').trim(),
        branch: String(row.branch || '').trim(),
        notes: String(row.notes || ''),
      });
    });
  }

  if (errors.length) {
    return res.status(400).json({ error: 'Batch validation failed', errors });
  }

  const writtenFiles = [];
  const insertedAds = [];

  try {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });

    for (const row of preparedRows) {
      const id = crypto.randomUUID();
      const filename = `${id}.html`;
      const targetPath = path.join(UPLOADS_DIR, filename);
      const html = row.file.buffer.toString('utf8');
      fs.writeFileSync(targetPath, html, 'utf8');
      writtenFiles.push(targetPath);

      const ad = insertAd({
        id,
        filename,
        title: row.title || parseTitle(html) || row.originalName.replace(/\.html$/i, ''),
        appId: row.appId,
        tags: row.tags,
        developer: row.developer,
        repo: row.repo,
        branch: row.branch,
        notes: row.notes,
      });
      insertedAds.push(ad);
    }

    res.status(201).json({ uploaded: insertedAds.length, ads: insertedAds });
  } catch (err) {
    for (const ad of insertedAds) deleteAd(ad.id);
    for (const filePath of writtenFiles) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    console.error('Table batch upload failed:', err.message);
    res.status(500).json({ error: 'Batch upload failed' });
  }
});

module.exports = router;
