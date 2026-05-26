import { useEffect, useRef, useState } from 'react';
import { lookupApp } from '../api';
import '../pages/Apps.css';

export default function AppModal({ app, onSave, onClose }) {
  const dialogRef = useRef();
  const [name, setName] = useState(app?.name || '');
  const [iosUrl, setIosUrl] = useState(app?.ios_url || '');
  const [androidUrl, setAndroidUrl] = useState(app?.android_url || '');
  const [iconUrl, setIconUrl] = useState(app?.icon_url || '');
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dialogRef.current?.showModal();
    return () => dialogRef.current?.close();
  }, []);

  async function handleUrlBlur(url) {
    const trimmed = url.trim();
    if (!trimmed || (!trimmed.includes('apps.apple.com') && !trimmed.includes('play.google.com'))) return;
    setFetching(true);
    setFetchError('');
    try {
      const data = await lookupApp(trimmed);
      if (!name) setName(data.name);
      if (data.icon_url) setIconUrl(data.icon_url);
    } catch (err) {
      setFetchError(err.message);
    } finally {
      setFetching(false);
    }
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), ios_url: iosUrl.trim(), android_url: androidUrl.trim(), icon_url: iconUrl });
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog ref={dialogRef} className="app-modal" onClose={onClose}>
      <h2>{app ? 'Edit Application' : 'New Application'}</h2>

      <label>
        iOS App Store URL
        <input
          value={iosUrl}
          onChange={e => setIosUrl(e.target.value)}
          onBlur={e => handleUrlBlur(e.target.value)}
          placeholder="https://apps.apple.com/app/..."
        />
      </label>

      <label>
        Android Play Store URL
        <input
          value={androidUrl}
          onChange={e => setAndroidUrl(e.target.value)}
          onBlur={e => handleUrlBlur(e.target.value)}
          placeholder="https://play.google.com/store/apps/..."
        />
      </label>

      <div className="app-modal__name-row">
        {iconUrl && (
          <img src={iconUrl} alt="" className="app-modal__icon-preview" onError={() => setIconUrl('')} />
        )}
        <label style={{ flex: 1 }}>
          Name
          <div className="app-modal__name-input-wrap">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={fetching ? 'Fetching…' : 'App name'}
              autoFocus={!iosUrl && !androidUrl}
            />
            {fetching && <span className="app-modal__spinner" />}
          </div>
        </label>
      </div>

      {fetchError && <p className="app-modal__fetch-error">Could not auto-fill: {fetchError}</p>}

      <div className="app-modal__footer">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !name.trim() || fetching}
          className="btn-primary"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </dialog>
  );
}
