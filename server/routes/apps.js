const express = require('express');
const { URL } = require('url');
const { listApps, getApp, insertApp, updateApp, deleteApp } = require('../db');

const router = express.Router();

// ── store lookup helper ───────────────────────────────────────────────────────

function metaContent(html, property) {
  // handles both attribute orderings
  const patterns = [
    new RegExp(`<meta[^>]+property="${property}"[^>]+content="([^"]*)"`, 'i'),
    new RegExp(`<meta[^>]+content="([^"]*)"[^>]+property="${property}"`, 'i'),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return m[1];
  }
  return null;
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    signal: AbortSignal.timeout(10000),
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function lookupAppStore(storeUrl) {
  const m = storeUrl.match(/\/id(\d+)/);
  if (!m) throw new Error('Could not parse App Store app ID from URL');
  const body = await fetchText(`https://itunes.apple.com/lookup?id=${m[1]}`);
  const data = JSON.parse(body);
  const r = data.results?.[0];
  if (!r) throw new Error('App not found in iTunes catalogue');
  return {
    name: r.trackName,
    icon_url: r.artworkUrl512 || r.artworkUrl100 || r.artworkUrl60 || '',
  };
}

async function lookupPlayStore(storeUrl) {
  const m = storeUrl.match(/[?&]id=([^&]+)/);
  if (!m) throw new Error('Could not parse Play Store package ID from URL');
  const body = await fetchText(`https://play.google.com/store/apps/details?id=${m[1]}&hl=en`);
  const title = metaContent(body, 'og:title');
  if (!title) throw new Error('Could not extract app name from Play Store page');
  const name = title.replace(/\s*[-–]\s*Apps on Google Play\s*$/i, '').trim();
  const icon_url = metaContent(body, 'og:image') || '';
  return { name, icon_url };
}

// ── routes ────────────────────────────────────────────────────────────────────

router.get('/lookup', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url query param is required' });

  try {
    new URL(url); // validate
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  try {
    if (url.includes('apps.apple.com')) {
      return res.json(await lookupAppStore(url));
    }
    if (url.includes('play.google.com')) {
      return res.json(await lookupPlayStore(url));
    }
    return res.status(422).json({ error: 'URL must be an App Store or Play Store link' });
  } catch (err) {
    console.error('App lookup failed:', err.message);
    res.status(502).json({ error: err.message || 'Lookup failed' });
  }
});

router.get('/', (_req, res) => {
  res.json(listApps());
});

router.post('/', (req, res) => {
  const { name, ios_url, android_url, icon_url } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
  const app = insertApp({ name: name.trim(), ios_url: ios_url || '', android_url: android_url || '', icon_url: icon_url || '' });
  res.status(201).json(app);
});

router.patch('/:id', (req, res) => {
  const existing = getApp(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const { name, ios_url, android_url, icon_url } = req.body;
  const updated = updateApp(req.params.id, {
    name: name ?? existing.name,
    ios_url: ios_url ?? existing.ios_url,
    android_url: android_url ?? existing.android_url,
    icon_url: icon_url ?? existing.icon_url,
  });
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const app = deleteApp(req.params.id);
  if (!app) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
});

module.exports = router;
