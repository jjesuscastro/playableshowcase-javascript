import { useEffect, useRef, useState } from 'react';
import './MetadataModal.css';

export default function MetadataModal({ ad, apps = [], developers = [], onSave, onClose }) {
  const dialogRef = useRef();
  const fileInputRef = useRef();
  const [title, setTitle] = useState(ad.title);
  const [appId, setAppId] = useState(ad.appId || '');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState(ad.tags || []);
  const [repo, setRepo] = useState(ad.repo || '');
  const [branch, setBranch] = useState(ad.branch || 'main');
  const [developer, setDeveloper] = useState(ad.developer || '');
  const [notes, setNotes] = useState(ad.notes || '');
  const [newFile, setNewFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    dialogRef.current?.showModal();
    return () => dialogRef.current?.close();
  }, []);

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput('');
  }

  function removeTag(t) {
    setTags(tags.filter(x => x !== t));
  }

  function handleFileChange(e) {
    setNewFile(e.target.files[0] || null);
  }

  function clearFile() {
    setNewFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSave() {
    if (!appId) { setError('Application is required.'); return; }
    setError('');
    setSaving(true);
    try {
      await onSave({ title, appId, tags, developer: developer.trim(), repo: repo.trim(), branch: branch.trim(), notes, newFile });
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog ref={dialogRef} className="meta-modal" onClose={onClose}>
      <h2>Edit Metadata</h2>

      <label>
        Title
        <input value={title} onChange={e => setTitle(e.target.value)} />
      </label>

      <label>
        Application <span className="meta-modal__required">*</span>
        <select value={appId} onChange={e => setAppId(e.target.value)} className="meta-modal__select">
          <option value="">— select application —</option>
          {apps.map(a => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </label>

      <label>
        Tags
        <div className="meta-modal__tag-row">
          <input
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => (e.key === 'Enter' || e.key === ',') && (e.preventDefault(), addTag())}
            placeholder="Add tag, press Enter"
          />
          <button type="button" onClick={addTag}>Add</button>
        </div>
        <div className="meta-modal__tags">
          {tags.map(t => (
            <span key={t} className="tag">
              {t} <button type="button" onClick={() => removeTag(t)}>×</button>
            </span>
          ))}
        </div>
      </label>

      <label>
        Developer
        <select value={developer} onChange={e => setDeveloper(e.target.value)} className="meta-modal__select">
          <option value="">— select developer —</option>
          {developers.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
        </select>
      </label>

      <div className="meta-modal__row2">
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

      <div className="meta-modal__replace">
        <div className="meta-modal__replace-header">
          <span className="meta-modal__replace-label">Replace HTML</span>
          <a
            href={`/uploads/${ad.filename}`}
            download={`${ad.title}.html`}
            className="meta-modal__download"
          >
            ↓ Download current
          </a>
        </div>
        <div className="meta-modal__replace-row">
          <input
            ref={fileInputRef}
            type="file"
            accept=".html,text/html"
            id="replace-file"
            className="meta-modal__file-input"
            onChange={handleFileChange}
          />
          <label htmlFor="replace-file" className="btn-secondary meta-modal__file-btn">
            Choose file
          </label>
          {newFile ? (
            <span className="meta-modal__file-name">
              {newFile.name}
              <button type="button" onClick={clearFile} className="meta-modal__file-clear">×</button>
            </span>
          ) : (
            <span className="meta-modal__file-hint">No file selected</span>
          )}
        </div>
      </div>

      {error && <p className="meta-modal__error">{error}</p>}

      <div className="meta-modal__footer">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="button" onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </dialog>
  );
}
