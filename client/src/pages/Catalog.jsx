import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdCard from '../components/AdCard';
import AppLayout from '../components/AppLayout';
import FloatingActionButton from '../components/FloatingActionButton';
import MainSidebar from '../components/MainSidebar';
import MetadataModal from '../components/MetadataModal';
import ScreenshotPickerModal from '../components/ScreenshotPickerModal';
import UploadPreviewModal from '../components/UploadPreviewModal';
import { deleteAd, listAds, listApps, listDevelopers, updateAd, updateAdFile, uploadAd } from '../api';
import { matchAppFromStoreLinks, storeLinksFromHtml } from '../utils/storeLinks';
import './Catalog.css';

export default function Catalog() {
  const navigate = useNavigate();
  const fileInputRef = useRef();
  const uploadQueueRef = useRef([]);

  const [ads, setAds] = useState([]);
  const [adsError, setAdsError] = useState('');
  const [apps, setApps] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [activeAppId, setActiveAppId] = useState(null);
  const [search, setSearch] = useState('');
  const [editingAd, setEditingAd] = useState(null);
  const [pendingAd, setPendingAd] = useState(null);
  const [screenshotPickAd, setScreenshotPickAd] = useState(null);

  useEffect(() => {
    listApps()
      .then(list => setApps([...list].sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => {});
    listDevelopers().then(setDevelopers).catch(() => {});
  }, []);
  useEffect(() => {
    let active = true;
    setAdsError('');
    listAds(activeAppId)
      .then(list => { if (active) setAds(list); })
      .catch(() => {
        if (!active) return;
        setAds([]);
        setAdsError('Could not load playables. Refresh the page or check the browser content blocker.');
      });
    return () => { active = false; };
  }, [activeAppId]);

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
      let html = '';
      try { html = await file.text(); } catch {}
      const storeLinks = storeLinksFromHtml(html);
      const matchedApp = matchAppFromStoreLinks(storeLinks, apps);
      const ad = await uploadAd(file);
      setPendingAd({ ...ad, appId: matchedApp?.id || '', _storeLinks: storeLinks, _appMatch: matchedApp?.name || '', _next: processNext });
    } catch (err) {
      console.error('Upload failed', err);
      processNext();
    }
  }

  async function handleUploadSave(data) {
    const updated = await updateAd(pendingAd.id, data);
    setAds(prev => [updated, ...prev.filter(a => a.id !== updated.id)]);
    // Refresh apps in case a new one was created inside the upload modal
    listApps()
      .then(list => setApps([...list].sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => {});
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
    const adId = editingAd.id;
    if (newFile) await updateAdFile(adId, newFile);
    const updated = await updateAd(adId, data);
    setAds(prev => prev.map(a => a.id === updated.id ? updated : a));
    setEditingAd(null);
    if (newFile) {
      setScreenshotPickAd(updated);
    }
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
    <MainSidebar
      active="catalog"
      apps={apps}
      activeAppId={activeAppId}
      search={search}
      onSearch={setSearch}
      onFilterApp={setActiveAppId}
    />
  );
  return (
    <AppLayout sidebar={sidebar}>
      <input ref={fileInputRef} type="file" accept=".html" multiple style={{ display: 'none' }} onChange={handleFileSelect} />
      <div className="catalog">
        {adsError ? (
          <p className="catalog__empty">{adsError}</p>
        ) : visibleAds.length === 0 && (
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

      <FloatingActionButton
        label="Add playable"
        actions={[
          { label: 'Upload HTML', description: 'Add one or more files', onClick: openFilePicker },
          { label: 'Batch Upload', description: 'Upload a zip manifest', onClick: () => navigate('/upload') },
        ]}
      />

      {pendingAd && (
        <UploadPreviewModal
          ad={pendingAd}
          apps={apps}
          developers={developers}
          onSave={handleUploadSave}
          onClose={handleUploadCancel}
        />
      )}

      {editingAd && (
        <MetadataModal
          ad={editingAd}
          apps={apps}
          developers={developers}
          onSave={handleSave}
          onClose={() => setEditingAd(null)}
        />
      )}

      {screenshotPickAd && (
        <ScreenshotPickerModal
          ad={screenshotPickAd}
          onDone={shot => {
            setAds(prev => prev.map(a => a.id === shot.id ? shot : a));
            setScreenshotPickAd(null);
          }}
          onSkip={() => setScreenshotPickAd(null)}
        />
      )}
    </AppLayout>
  );
}
