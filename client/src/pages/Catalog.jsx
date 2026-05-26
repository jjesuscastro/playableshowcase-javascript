import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdCard from '../components/AdCard';
import AppLayout from '../components/AppLayout';
import MetadataModal from '../components/MetadataModal';
import UploadPreviewModal from '../components/UploadPreviewModal';
import { deleteAd, listAds, listApps, updateAd, updateAdFile, uploadAd } from '../api';
import './Catalog.css';

export default function Catalog() {
  const navigate = useNavigate();
  const fileInputRef = useRef();
  const uploadQueueRef = useRef([]);

  const [ads, setAds] = useState([]);
  const [apps, setApps] = useState([]);
  const [activeAppId, setActiveAppId] = useState(null);
  const [search, setSearch] = useState('');
  const [editingAd, setEditingAd] = useState(null);
  const [pendingAd, setPendingAd] = useState(null);

  useEffect(() => {
    listApps()
      .then(list => setApps([...list].sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => {});
  }, []);
  useEffect(() => { listAds(activeAppId).then(setAds).catch(() => {}); }, [activeAppId]);

  // ── upload flow ──────────────────────────────────────────────────────────

  function openFilePicker() { fileInputRef.current.click(); }

  async function handleFileSelect(e) {
    const files = [...e.target.files];
    e.target.value = '';
    if (!files.length) return;
    uploadQueueRef.current = files;
    processNext();
  }

  async function processNext() {
    const file = uploadQueueRef.current.shift();
    if (!file) return;
    try {
      const ad = await uploadAd(file);
      setPendingAd({ ...ad, _next: processNext });
    } catch (err) {
      console.error('Upload failed', err);
      processNext();
    }
  }

  async function handleUploadSave(data) {
    const updated = await updateAd(pendingAd.id, data);
    setAds(prev => [updated, ...prev.filter(a => a.id !== updated.id)]);
    const next = pendingAd._next;
    setPendingAd(null);
    if (next) next();
  }

  async function handleUploadCancel() {
    deleteAd(pendingAd.id).catch(() => {});
    uploadQueueRef.current = [];
    setPendingAd(null);
  }

  // ── edit existing ────────────────────────────────────────────────────────

  async function handleSave({ newFile, ...data }) {
    if (newFile) await updateAdFile(editingAd.id, newFile);
    const updated = await updateAd(editingAd.id, data);
    setAds(prev => prev.map(a => a.id === updated.id ? updated : a));
    setEditingAd(null);
  }

  async function handleDelete(ad) {
    if (!confirm(`Delete "${ad.title}"?`)) return;
    await deleteAd(ad.id);
    setAds(prev => prev.filter(a => a.id !== ad.id));
  }

  const appsById = Object.fromEntries(apps.map(a => [a.id, a]));

  // ── search filter ────────────────────────────────────────────────────────

  const query = search.trim().toLowerCase();
  const visibleAds = query
    ? ads.filter(ad => {
        const appName = appsById[ad.appId]?.name?.toLowerCase() || '';
        return (
          ad.title.toLowerCase().includes(query) ||
          (ad.developer || '').toLowerCase().includes(query) ||
          appName.includes(query) ||
          (ad.tags || []).some(t => t.includes(query))
        );
      })
    : ads;

  const sidebar = (
    <>
      <div className="sb-brand">Playable Showcase</div>

      <div className="sb-nav">
        <input ref={fileInputRef} type="file" accept=".html" multiple style={{ display: 'none' }} onChange={handleFileSelect} />
        <button className="sb-btn sb-btn--primary" onClick={openFilePicker}>+ Upload</button>
        <button className="sb-btn" onClick={() => navigate('/apps')}>Applications</button>
      </div>

      <div className="sb-divider" />
      <div className="catalog__search-wrap">
        <input
          className="catalog__search"
          type="search"
          placeholder="Search…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {apps.length > 0 && (
        <>
          <div className="sb-divider" />
          <span className="sb-section-label">Filter by App</span>
          <div className="sb-nav" style={{ paddingTop: 0 }}>
            <button
              className={`sb-btn${activeAppId === null ? ' sb-btn--active' : ''}`}
              onClick={() => setActiveAppId(null)}
            >
              All
            </button>
            {apps.map(a => (
              <button
                key={a.id}
                className={`sb-btn${activeAppId === a.id ? ' sb-btn--active' : ''}`}
                onClick={() => setActiveAppId(a.id)}
              >
                {a.icon_url
                  ? <img src={a.icon_url} className="sb-app-icon" alt="" onError={e => { e.target.style.display = 'none'; }} />
                  : <div className="sb-app-icon-placeholder" />
                }
                {a.name}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );

  return (
    <AppLayout sidebar={sidebar}>
      <div className="catalog">
        {visibleAds.length === 0 && (
          <p className="catalog__empty">
            {query ? 'No results.' : 'No playables yet. Click + Upload to add one.'}
          </p>
        )}
        <div className="catalog__grid">
          {visibleAds.map(ad => (
            <AdCard
              key={ad.id}
              ad={ad}
              app={appsById[ad.appId]}
              onEdit={setEditingAd}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </div>

      {pendingAd && (
        <UploadPreviewModal
          ad={pendingAd}
          apps={apps}
          onSave={handleUploadSave}
          onClose={handleUploadCancel}
        />
      )}

      {editingAd && (
        <MetadataModal
          ad={editingAd}
          apps={apps}
          onSave={handleSave}
          onClose={() => setEditingAd(null)}
        />
      )}
    </AppLayout>
  );
}
