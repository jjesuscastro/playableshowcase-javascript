import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DropZone from '../components/DropZone';
import MetadataModal from '../components/MetadataModal';
import { deleteAd, listApps, updateAd, updateAdFile, uploadAd } from '../api';
import './Upload.css';

export default function Upload() {
  const navigate = useNavigate();
  const [apps, setApps] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [editingAd, setEditingAd] = useState(null);
  const [doneCount, setDoneCount] = useState(0);
  const uploadQueueRef = useRef([]);

  useEffect(() => {
    listApps().then(setApps).catch(() => {});
  }, []);

  async function handleFiles(files) {
    setUploading(true);
    setDoneCount(0);
    uploadQueueRef.current = [...files];
    processNext();
  }

  async function processNext() {
    const file = uploadQueueRef.current.shift();
    if (!file) { setUploading(false); return; }
    try {
      const ad = await uploadAd(file);
      setEditingAd({ ...ad, _afterSave: processNext });
    } catch (err) {
      console.error('Upload failed', err);
      processNext();
    }
  }

  async function handleSave({ newFile, ...data }) {
    if (newFile) await updateAdFile(editingAd.id, newFile);
    await updateAd(editingAd.id, data);
    setDoneCount(c => c + 1);
    const after = editingAd._afterSave;
    setEditingAd(null);
    if (after) after();
  }

  function handleClose() {
    // The file was already uploaded — delete it since the user cancelled
    if (editingAd) deleteAd(editingAd.id).catch(() => {});
    // Discard any remaining queued files
    uploadQueueRef.current = [];
    setEditingAd(null);
    setUploading(false);
  }

  return (
    <div className="upload-page">
      <header className="upload-page__header">
        <button className="upload-page__back" onClick={() => navigate('/')}>← Catalog</button>
        <h1>Upload Playables</h1>
      </header>

      {!uploading && doneCount === 0 && (
        <div className="upload-page__zone">
          <DropZone onFiles={handleFiles} />
          {apps.length === 0 && (
            <p className="upload-page__warning">
              No applications configured yet.{' '}
              <button className="upload-page__link" onClick={() => navigate('/apps')}>
                Create one first
              </button>{' '}
              so you can link playables.
            </p>
          )}
        </div>
      )}

      {uploading && !editingAd && (
        <p className="upload-page__status">Uploading…</p>
      )}

      {!uploading && doneCount > 0 && (
        <div className="upload-page__done">
          <p className="upload-page__done-msg">
            {doneCount} playable{doneCount !== 1 ? 's' : ''} uploaded successfully.
          </p>
          <div className="upload-page__done-actions">
            <button className="btn-secondary" onClick={() => { setDoneCount(0); }}>Upload more</button>
            <button className="btn-primary" onClick={() => navigate('/')}>View in Catalog</button>
          </div>
        </div>
      )}

      {editingAd && (
        <MetadataModal
          ad={editingAd}
          apps={apps}
          onSave={handleSave}
          onClose={handleClose}
        />
      )}
    </div>
  );
}
