const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'ads.json');
const APPS_DB_PATH = process.env.APPS_DB_PATH || path.join(__dirname, '..', 'data', 'apps.json');
const DECKS_DB_PATH = process.env.DECKS_DB_PATH || path.join(__dirname, '..', 'data', 'decks.json');

// ── ads ──────────────────────────────────────────────────────────────────────

function readDb() {
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); }
  catch { return []; }
}

function writeDb(ads) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(ads, null, 2), 'utf8');
}

function listAds(appId) {
  const ads = readDb();
  if (appId) return ads.filter(ad => ad.appId === appId);
  return ads;
}

function getAd(id) {
  return readDb().find(ad => ad.id === id) || null;
}

function insertAd({ id, filename, title, appId, tags, developer, repo, branch, notes }) {
  const ads = readDb();
  const now = Date.now();
  const ad = { id, filename, title, appId: appId || null, tags: tags || [], developer: developer || '', repo: repo || '', branch: branch || '', notes: notes || '', thumbnail: null, uploaded_at: now, updated_at: now };
  ads.unshift(ad);
  writeDb(ads);
  return ad;
}

function updateAd(id, { title, appId, tags, developer, repo, branch, notes }) {
  const ads = readDb();
  const idx = ads.findIndex(ad => ad.id === id);
  if (idx === -1) return null;
  ads[idx] = {
    ...ads[idx],
    title,
    appId: appId ?? ads[idx].appId ?? null,
    tags: tags ?? ads[idx].tags ?? [],
    developer: developer ?? ads[idx].developer ?? '',
    repo: repo ?? ads[idx].repo ?? '',
    branch: branch ?? ads[idx].branch ?? '',
    notes: notes ?? ads[idx].notes ?? '',
    updated_at: Date.now(),
  };
  writeDb(ads);
  return ads[idx];
}

function updateAdFile(id, filename) {
  const ads = readDb();
  const idx = ads.findIndex(ad => ad.id === id);
  if (idx === -1) return null;
  ads[idx] = { ...ads[idx], filename, updated_at: Date.now() };
  writeDb(ads);
  return ads[idx];
}

function updateAdThumbnail(id, thumbnail) {
  const ads = readDb();
  const idx = ads.findIndex(ad => ad.id === id);
  if (idx === -1) return null;
  ads[idx] = { ...ads[idx], thumbnail, updated_at: Date.now() };
  writeDb(ads);
  return ads[idx];
}

function deleteAd(id) {
  const ads = readDb();
  const idx = ads.findIndex(ad => ad.id === id);
  if (idx === -1) return null;
  const [ad] = ads.splice(idx, 1);
  writeDb(ads);
  return ad;
}

// ── apps ─────────────────────────────────────────────────────────────────────

function readAppsDb() {
  try { return JSON.parse(fs.readFileSync(APPS_DB_PATH, 'utf8')); }
  catch { return []; }
}

function writeAppsDb(apps) {
  fs.mkdirSync(path.dirname(APPS_DB_PATH), { recursive: true });
  fs.writeFileSync(APPS_DB_PATH, JSON.stringify(apps, null, 2), 'utf8');
}

function listApps() {
  return readAppsDb();
}

function getApp(id) {
  return readAppsDb().find(a => a.id === id) || null;
}

function insertApp({ name, ios_url, android_url, icon_url }) {
  const apps = readAppsDb();
  const app = { id: crypto.randomUUID(), name, icon_url: icon_url || '', ios_url: ios_url || '', android_url: android_url || '', created_at: Date.now() };
  apps.unshift(app);
  writeAppsDb(apps);
  return app;
}

function updateApp(id, { name, ios_url, android_url, icon_url }) {
  const apps = readAppsDb();
  const idx = apps.findIndex(a => a.id === id);
  if (idx === -1) return null;
  apps[idx] = { ...apps[idx], name, icon_url: icon_url ?? apps[idx].icon_url ?? '', ios_url: ios_url || '', android_url: android_url || '' };
  writeAppsDb(apps);
  return apps[idx];
}

function deleteApp(id) {
  const apps = readAppsDb();
  const idx = apps.findIndex(a => a.id === id);
  if (idx === -1) return null;
  const [app] = apps.splice(idx, 1);
  writeAppsDb(apps);
  return app;
}

function readDecksDb() {
  try { return JSON.parse(fs.readFileSync(DECKS_DB_PATH, 'utf8')); }
  catch { return []; }
}

function writeDecksDb(decks) {
  fs.mkdirSync(path.dirname(DECKS_DB_PATH), { recursive: true });
  fs.writeFileSync(DECKS_DB_PATH, JSON.stringify(decks, null, 2), 'utf8');
}

function listDecks() { return readDecksDb(); }
function getDeck(id) { return readDecksDb().find(deck => deck.id === id) || null; }
function insertDeck({ name, adIds }) {
  const decks = readDecksDb();
  const deck = { id: crypto.randomUUID(), name, adIds, created_at: Date.now() };
  decks.unshift(deck);
  writeDecksDb(decks);
  return deck;
}
function deleteDeck(id) {
  const decks = readDecksDb();
  const idx = decks.findIndex(deck => deck.id === id);
  if (idx === -1) return null;
  const [deck] = decks.splice(idx, 1);
  writeDecksDb(decks);
  return deck;
}

// ── developers ───────────────────────────────────────────────────────────────

const DEVS_DB_PATH = process.env.DEVS_DB_PATH || path.join(__dirname, '..', 'data', 'developers.json');

const DEFAULT_DEVELOPERS = [
  'Belgica, Sean',
  'Caamino, Adrian',
  'Castro, Jesus',
  'Coronel, Will',
  'Esteron, Jericson',
  'Fajardo, Jules',
  'Florentino, Marcus',
  'Lenomta, MJ',
  'Malana, Marco',
  'Mocorro, Jet',
  'Mondejar, Kevin',
  'Obzunar, Nic',
  'Tecson, Nat',
  'Tesalona, Allen',
];

function readDevsDb() {
  try { return JSON.parse(fs.readFileSync(DEVS_DB_PATH, 'utf8')); }
  catch { return null; }
}

function writeDevsDb(devs) {
  fs.mkdirSync(path.dirname(DEVS_DB_PATH), { recursive: true });
  fs.writeFileSync(DEVS_DB_PATH, JSON.stringify(devs, null, 2), 'utf8');
}

function listDevelopers() {
  const stored = readDevsDb();
  if (stored) return stored;
  // Seed from defaults on first access
  const seeded = DEFAULT_DEVELOPERS.map(name => ({ id: crypto.randomUUID(), name }));
  writeDevsDb(seeded);
  return seeded;
}

function addDeveloper(name) {
  const devs = listDevelopers();
  if (devs.some(d => d.name.toLowerCase() === name.toLowerCase())) return null;
  const dev = { id: crypto.randomUUID(), name };
  devs.push(dev);
  devs.sort((a, b) => a.name.localeCompare(b.name));
  writeDevsDb(devs);
  return dev;
}

function removeDeveloper(id) {
  const devs = listDevelopers();
  const idx = devs.findIndex(d => d.id === id);
  if (idx === -1) return null;
  const [dev] = devs.splice(idx, 1);
  writeDevsDb(devs);
  return dev;
}

module.exports = { listAds, getAd, insertAd, updateAd, updateAdFile, updateAdThumbnail, deleteAd, listApps, getApp, insertApp, updateApp, deleteApp, listDecks, getDeck, insertDeck, deleteDeck, listDevelopers, addDeveloper, removeDeveloper };
