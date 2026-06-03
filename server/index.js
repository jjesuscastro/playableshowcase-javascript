require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads');

// 10mb limit needed for base64-encoded screenshot payloads
app.use(express.json({ limit: '10mb' }));

// Auth middleware for protected API routes
function requireAuth(req, res, next) {
  const password = (process.env.SHOWCASE_PASSWORD || '').trim();
  if (!password) return next(); // not configured, skip

  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const expected = crypto.createHmac('sha256', password).update('showcase-session').digest('hex');

  if (token !== expected) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Auth route (public)
app.use('/api/auth', require('./routes/auth').router);

// Protected API routes
app.use('/api/apps', requireAuth, require('./routes/apps'));
app.use('/api/developers', requireAuth, require('./routes/developers'));
app.use('/api/ads', requireAuth, require('./routes/upload'));
app.use('/api/ads', requireAuth, require('./routes/ads'));

// Serve uploaded HTML files
app.use('/uploads', express.static(UPLOADS_DIR));

// Serve React build in production
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));
app.get('*', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Playable Showcase running on http://localhost:${PORT}`);
});
