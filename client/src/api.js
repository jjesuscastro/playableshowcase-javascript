const ADS_BASE = '/api/ads';
const APPS_BASE = '/api/apps';

function authHeaders(extra = {}) {
  const token = localStorage.getItem('showcase_token');
  return token ? { Authorization: `Bearer ${token}`, ...extra } : { ...extra };
}

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { ...authHeaders(), ...options.headers },
  });
  if (res.status === 401) {
    localStorage.removeItem('showcase_token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  return res;
}

// ── auth ─────────────────────────────────────────────────────────────────────

export async function login(password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw new Error('Invalid password');
  const { token } = await res.json();
  localStorage.setItem('showcase_token', token);
}

export function logout() {
  localStorage.removeItem('showcase_token');
}

export function isAuthenticated() {
  return !!localStorage.getItem('showcase_token');
}

// ── ads ──────────────────────────────────────────────────────────────────────

export async function listAds(appId) {
  const url = appId ? `${ADS_BASE}?appId=${encodeURIComponent(appId)}` : ADS_BASE;
  const res = await apiFetch(url);
  if (!res.ok) throw new Error('Failed to fetch ads');
  return res.json();
}

export async function getAd(id) {
  const res = await apiFetch(`${ADS_BASE}/${id}`);
  if (!res.ok) throw new Error('Ad not found');
  return res.json();
}

export async function uploadAd(file) {
  const form = new FormData();
  form.append('file', file);
  const res = await apiFetch(ADS_BASE, { method: 'POST', body: form });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

export async function updateAd(id, data) {
  const res = await apiFetch(`${ADS_BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Update failed');
  return res.json();
}

export async function updateAdFile(id, file) {
  const form = new FormData();
  form.append('file', file);
  const res = await apiFetch(`${ADS_BASE}/${id}/file`, { method: 'POST', body: form });
  if (!res.ok) throw new Error('File update failed');
  return res.json();
}

export async function deleteAd(id) {
  const res = await apiFetch(`${ADS_BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Delete failed');
}

export async function requestScreenshot(id) {
  const res = await apiFetch(`${ADS_BASE}/${id}/screenshot`, { method: 'POST' });
  if (!res.ok) throw new Error('Screenshot failed');
  return res.json();
}

export async function requestScreenshotCandidates(id) {
  const res = await apiFetch(`${ADS_BASE}/${id}/screenshot-candidates`, { method: 'POST' });
  if (!res.ok) throw new Error('Screenshot candidates failed');
  return res.json();
}

export async function saveThumbnail(id, dataUrl) {
  const res = await apiFetch(`${ADS_BASE}/${id}/thumbnail`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataUrl }),
  });
  if (!res.ok) throw new Error('Thumbnail save failed');
  return res.json();
}

// ── developers ───────────────────────────────────────────────────────────────

export async function listDevelopers() {
  const res = await apiFetch('/api/developers');
  if (!res.ok) throw new Error('Failed to fetch developers');
  return res.json();
}

export async function addDeveloper(name) {
  const res = await apiFetch('/api/developers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('Failed to add developer');
  return res.json();
}

export async function removeDeveloper(id) {
  const res = await apiFetch(`/api/developers/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to remove developer');
}

// ── apps ─────────────────────────────────────────────────────────────────────

export async function lookupApp(url) {
  const res = await apiFetch(`${APPS_BASE}/lookup?url=${encodeURIComponent(url)}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Lookup failed');
  }
  return res.json();
}

export async function listApps() {
  const res = await apiFetch(APPS_BASE);
  if (!res.ok) throw new Error('Failed to fetch apps');
  return res.json();
}

export async function createApp(data) {
  const res = await apiFetch(APPS_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Create app failed');
  return res.json();
}

export async function updateApp(id, data) {
  const res = await apiFetch(`${APPS_BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Update app failed');
  return res.json();
}

export async function deleteApp(id) {
  const res = await apiFetch(`${APPS_BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Delete app failed');
}
