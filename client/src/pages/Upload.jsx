import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import DropZone from '../components/DropZone';
import MainSidebar from '../components/MainSidebar';
import MetadataModal from '../components/MetadataModal';
import { deleteAd, listApps, updateAd, updateAdFile, uploadAd, uploadAdsBatch } from '../api';
import './Upload.css';

export default function Upload() {
  const navigate = useNavigate();
  const [apps, setApps] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [batchUploading, setBatchUploading] = useState(false);
  const [batchErrors, setBatchErrors] = useState([]);
  const [editingAd, setEditingAd] = useState(null);
  const [doneCount, setDoneCount] = useState(0);
  const [doneLabel, setDoneLabel] = useState('');
  const zipInputRef = useRef();
  const uploadQueueRef = useRef([]);

  useEffect(() => {
    listApps().then(setApps).catch(() => {});
  }, []);

  async function handleFiles(files) {
    setUploading(true);
    setBatchErrors([]);
    setDoneLabel('');
    setDoneCount(0);
    uploadQueueRef.current = [...files];
    processNext();
  }

  async function handleBatchFile(file) {
    if (!file) return;
    setBatchUploading(true);
    setBatchErrors([]);
    setDoneCount(0);
    setDoneLabel('');
    try {
      const result = await uploadAdsBatch(file);
      setDoneCount(result.uploaded || 0);
      setDoneLabel(` from ${file.name}`);
    } catch (err) {
      setBatchErrors(err.errors?.length ? err.errors : [err.message || 'Batch upload failed']);
    } finally {
      setBatchUploading(false);
      if (zipInputRef.current) zipInputRef.current.value = '';
    }
  }

  function handleZipChange(e) {
    handleBatchFile(e.target.files[0]);
  }

  function downloadTemplate() {
    const csv = [
      'filename,title,app,tags,developer,repo,branch,notes',
      'playable-a,Playable A,My App,"puzzle,level-1","Castro, Jesus",owner/repo,main,Notes here',
    ].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'manifest-template.csv';
    link.click();
    URL.revokeObjectURL(url);
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

  const sidebar = <MainSidebar active="upload" />;

  return (
    <AppLayout sidebar={sidebar}>
    <div className="upload-page">
      <header className="upload-page__header">
        <button className="upload-page__back" onClick={() => navigate('/')}>← Catalog</button>
        <h1>Upload Playables</h1>
      </header>

      {!uploading && doneCount === 0 && (
        <div className="upload-page__zone">
          <DropZone onFiles={handleFiles} />

          <div className="upload-page__batch">
            <div>
              <h2>Batch upload</h2>
              <p>Upload a zip with root-level HTML files and manifest.csv.</p>
            </div>
            <input
              ref={zipInputRef}
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              className="upload-page__batch-input"
              onChange={handleZipChange}
            />
            <button
              type="button"
              className="btn-secondary upload-page__batch-btn"
              disabled={batchUploading}
              onClick={() => zipInputRef.current?.click()}
            >
              {batchUploading ? 'Uploading...' : 'Choose zip'}
            </button>
          </div>

          <section className="upload-page__instructions">
            <div className="upload-page__instructions-head">
              <h2>Batch zip format</h2>
              <button type="button" className="btn-secondary upload-page__template-btn" onClick={downloadTemplate}>
                Download CSV template
              </button>
            </div>
            <ul>
              <li>Put <code>manifest.csv</code> at the root of the zip.</li>
              <li>Put every playable <code>.html</code> file at the root of the zip.</li>
              <li>Match metadata to files with the CSV <code>filename</code> column; <code>.html</code> is optional.</li>
              <li>Use an existing application name in the <code>app</code> column.</li>
              <li>The upload is all-or-nothing: one invalid row blocks the whole batch.</li>
            </ul>
            <pre>{`filename,title,app,tags,developer,repo,branch,notes
playable-a,Playable A,My App,"puzzle,level-1","Castro, Jesus",owner/repo,main,Notes here`}</pre>
          </section>

          {batchErrors.length > 0 && (
            <div className="upload-page__errors">
              <strong>Batch validation failed</strong>
              <ul>
                {batchErrors.map((error, index) => (
                  <li key={`${error}-${index}`}>{error}</li>
                ))}
              </ul>
            </div>
          )}

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

      {batchUploading && (
        <p className="upload-page__status">Uploading batch...</p>
      )}

      {!uploading && !batchUploading && doneCount > 0 && (
        <div className="upload-page__done">
          <p className="upload-page__done-msg">
            {doneCount} playable{doneCount !== 1 ? 's' : ''} uploaded successfully{doneLabel}.
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
    </AppLayout>
  );
}
