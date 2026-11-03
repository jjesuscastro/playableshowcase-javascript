import { useEffect, useRef, useState } from 'react';
import { lookupApp } from '../api';
import { imageFileToPngDataUrl } from '../imageFile';
import '../pages/Apps.css';

export default function AppModal({ app, customOnly = false, onSave, onClose }) {
  const dialogRef = useRef();
  const iconInputRef = useRef();
  const [name, setName] = useState(app?.name || '');
  const [iosUrl, setIosUrl] = useState(app?.ios_url || '');
  const [androidUrl, setAndroidUrl] = useState(app?.android_url || '');
  const [iconUrl, setIconUrl] = useState(app?.icon_url || '');
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [saving, setSaving] = useState(false);
  const [iconError, setIconError] = useState('');

  useEffect(() => {
    dialogRef.current?.showModal();
    return () => dialogRef.current?.close();
  }, []);

  async function handleUrlBlur(url) {
    if (customOnly) return;
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

  async function handleIconChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setIconError('');
    try {
      setIconUrl(await imageFileToPngDataUrl(file));
    } catch (err) {
      setIconError(err.message || 'Could not load the selected icon.');
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
      <h2>{app ? 'Edit Application' : customOnly ? 'New Custom Application' : 'New Application'}</h2>

      {!customOnly && <label>
        iOS App Store URL
        <input
          value={iosUrl}
          onChange={e => setIosUrl(e.target.value)}
          onBlur={e => handleUrlBlur(e.target.value)}
          placeholder="https://apps.apple.com/app/..."
        />
      </label>}

      {!customOnly && <label>
        Android Play Store URL
        <input
          value={androidUrl}
          onChange={e => setAndroidUrl(e.target.value)}
          onBlur={e => handleUrlBlur(e.target.value)}
          placeholder="https://play.google.com/store/apps/..."
        />
      </label>}

      <div className="app-modal__name-row">
        <div className="app-modal__icon-picker">
          {iconUrl
            ? <img src={iconUrl} alt="Application icon preview" className="app-modal__icon-preview" onError={() => setIconUrl('')} />
            : <div className="app-modal__icon-preview app-modal__icon-placeholder" aria-hidden="true">Icon</div>}
          <input ref={iconInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleIconChange} hidden />
          <button type="button" className="btn-secondary app-modal__icon-button" onClick={() => iconInputRef.current?.click()}>
            {iconUrl ? 'Change icon' : 'Add icon'}
          </button>
        </div>
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

      {iconError && <p className="app-modal__fetch-error">{iconError}</p>}
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
