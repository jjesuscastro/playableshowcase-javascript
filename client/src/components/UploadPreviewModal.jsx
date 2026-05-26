import { useEffect, useRef, useState } from 'react';
import { createApp, requestScreenshot } from '../api';
import AppModal from './AppModal';
import './UploadPreviewModal.css';

export default function UploadPreviewModal({ ad, apps: appsProp = [], onSave, onClose }) {
  const dialogRef = useRef();
  const initialScreenshotStarted = useRef(false);

  const [title, setTitle] = useState(ad.title);
  const [appId, setAppId] = useState(ad.appId || '');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState(ad.tags || []);
  const [developer, setDeveloper] = useState(ad.developer || '');
  const [repo, setRepo] = useState(ad.repo || '');
  const [branch, setBranch] = useState(ad.branch || 'main');
  const [notes, setNotes] = useState(ad.notes || '');

  const [localApps, setLocalApps] = useState(appsProp);
  const [creatingApp, setCreatingApp] = useState(false);
  const [screenshotTaken, setScreenshotTaken] = useState(false);
  const [screenshotStatus, setScreenshotStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    dialogRef.current?.showModal();
    return () => dialogRef.current?.close();
  }, []);

  useEffect(() => {
    if (initialScreenshotStarted.current) return;
    initialScreenshotStarted.current = true;
    handleScreenshot();
  }, []);

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput('');
  }

  function removeTag(t) { setTags(tags.filter(x => x !== t)); }

  async function handleScreenshot() {
    setScreenshotStatus('saving');
    try {
      await requestScreenshot(ad.id);
      setScreenshotTaken(true);
      setScreenshotStatus('done');
    } catch {
      setScreenshotStatus('error');
      setTimeout(() => setScreenshotStatus(null), 2500);
    }
  }

  async function handleCreateApp(data) {
    const created = await createApp(data);
    setLocalApps(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    setAppId(created.id);
    setCreatingApp(false);
  }

  async function handleSave() {
    if (!appId) { setError('Application is required.'); return; }
    setError('');
    setSaving(true);
    try {
      await onSave({ title, appId, tags, developer: developer.trim(), repo: repo.trim(), branch: branch.trim(), notes });
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog ref={dialogRef} className="upm" onClose={onClose}>
      <div className="upm__layout">

        {/* ── Left: live preview ── */}
        <div className="upm__preview">
          <div className="upm__frame">
            <iframe

              src={`/uploads/${ad.filename}`}
              title="Playable preview"
              sandbox="allow-scripts allow-same-origin allow-forms"
              className="upm__iframe"
            />
          </div>
          {!screenshotTaken && (
            <p className="upm__shot-hint">
              {screenshotStatus === 'saving' ? 'Capturing initial thumbnail…' : 'Required before saving'}
            </p>
          )}
        </div>

        {/* ── Right: metadata form ── */}
        <div className="upm__form">
          <h2>New Playable</h2>

          <label>
            Title
            <input value={title} onChange={e => setTitle(e.target.value)} />
          </label>

          <label>
            Application <span className="upm__req">*</span>
            <div className="upm__app-row">
              <select value={appId} onChange={e => setAppId(e.target.value)} className="upm__select">
                <option value="">— select application —</option>
                {localApps.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <button type="button" className="upm__new-app-btn" onClick={() => setCreatingApp(true)}>+ New</button>
            </div>
          </label>

          <label>
            Tags
            <div className="upm__tag-row">
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => (e.key === 'Enter' || e.key === ',') && (e.preventDefault(), addTag())}
                placeholder="Add tag, press Enter"
              />
              <button type="button" onClick={addTag} className="upm__tag-add">Add</button>
            </div>
            <div className="upm__tags">
              {tags.map(t => (
                <span key={t} className="tag">
                  {t} <button type="button" onClick={() => removeTag(t)}>×</button>
                </span>
              ))}
            </div>
          </label>

          <label>
            Developer
            <input value={developer} onChange={e => setDeveloper(e.target.value)} placeholder="Developer or team name" />
          </label>

          <div className="upm__row2">
            <label>
              Repo
              <input value={repo} onChange={e => setRepo(e.target.value)} placeholder="owner/repo" />
            </label>
            <label>
              Branch
              <input value={branch} onChange={e => setBranch(e.target.value)} placeholder="main" />
            </label>
          </div>

          <label>
            Notes
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
          </label>

          {error && <p className="upm__error">{error}</p>}

          <div className="upm__footer">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !screenshotTaken}
              className="btn-primary"
              title={!screenshotTaken ? 'Take a screenshot first' : ''}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {creatingApp && (
        <AppModal
          app={null}
          onSave={handleCreateApp}
          onClose={() => setCreatingApp(false)}
        />
      )}
    </dialog>
  );
}
