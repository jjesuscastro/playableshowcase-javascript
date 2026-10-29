import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import AppModal from '../components/AppModal';
import DropZone from '../components/DropZone';
import MainSidebar from '../components/MainSidebar';
import { createApp, listApps, listDevelopers, uploadAdsBatchTable } from '../api';
import { matchAppFromStoreLinks, storeLinksFromHtml } from '../utils/storeLinks';
import './Upload.css';

function titleFromFilename(name) {
  return name.replace(/\.html$/i, '').replace(/[-_]+/g, ' ').trim();
}

function tagStringToArray(value) {
  return value.split(',').map(tag => tag.trim().toLowerCase()).filter(Boolean);
}

async function createRow(file, apps) {
  let html = '';
  try { html = await file.text(); } catch {}
  const links = storeLinksFromHtml(html);
  const matched = matchAppFromStoreLinks(links, apps);
  return {
    id: crypto.randomUUID(),
    file,
    filename: file.name,
    title: titleFromFilename(file.name),
    appId: matched?.id || '',
    storeLinks: links,
    appMatch: matched?.name || '',
    tagsText: '',
    developer: '',
    repo: '',
    branch: 'main',
    notes: '',
    error: '',
  };
}

export default function Upload() {
  const navigate = useNavigate();
  const [apps, setApps] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [rows, setRows] = useState([]);
  const [bulk, setBulk] = useState({ appId: '', tagsText: '', developer: '', repo: '', branch: 'main', notes: '' });
  const [uploading, setUploading] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const [batchErrors, setBatchErrors] = useState([]);
  const [creatingApp, setCreatingApp] = useState(false);
  const [pendingAppLinks, setPendingAppLinks] = useState(null);
  const fileInputRef = useRef();

  useEffect(() => {
    listApps().then(list => setApps([...list].sort((a, b) => a.name.localeCompare(b.name)))).catch(() => {});
    listDevelopers().then(setDevelopers).catch(() => {});
  }, []);

  function handleFiles(files) {
    const htmlFiles = [...files].filter(file => file.name.toLowerCase().endsWith('.html'));
    if (!htmlFiles.length) return;
    setDoneCount(0);
    setBatchErrors([]);
    Promise.all(htmlFiles.map(file => createRow(file, apps))).then(newRows => {
      setRows(prev => [...prev, ...newRows]);
    });
  }

  function updateRow(id, patch) {
    setRows(prev => prev.map(row => row.id === id ? { ...row, ...patch, error: '' } : row));
  }

  function removeRow(id) {
    setRows(prev => prev.filter(row => row.id !== id));
  }

  function copyPrevious(index) {
    if (index <= 0) return;
    const prev = rows[index - 1];
    updateRow(rows[index].id, {
      appId: prev.appId,
      tagsText: prev.tagsText,
      developer: prev.developer,
      repo: prev.repo,
      branch: prev.branch,
      notes: prev.notes,
    });
  }

  function applyBulk() {
    setRows(prev => prev.map(row => ({
      ...row,
      appId: bulk.appId,
      tagsText: bulk.tagsText,
      developer: bulk.developer,
      repo: bulk.repo,
      branch: bulk.branch,
      notes: bulk.notes,
      error: '',
    })));
  }

  async function handleCreateApp(data) {
    const created = await createApp(data);
    setApps(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    setBulk(prev => ({ ...prev, appId: created.id }));
    setRows(prev => prev.map(row => pendingAppLinks?.rowId === row.id
      ? { ...row, appId: created.id, appMatch: created.name, storeLinks: null }
      : row));
    setPendingAppLinks(null);
    setCreatingApp(false);
  }

  function validateRows() {
    const errors = [];
    const nextRows = rows.map((row, idx) => {
      if (!row.appId) {
        const message = 'Application is required.';
        errors.push(`Row ${idx + 1}: ${message}`);
        return { ...row, error: message };
      }
      return { ...row, error: '' };
    });
    setRows(nextRows);
    return errors;
  }

  async function uploadAll() {
    const validationErrors = validateRows();
    if (rows.length < 2) validationErrors.push('Add at least two HTML files.');
    if (validationErrors.length) {
      setBatchErrors(validationErrors);
      return;
    }

    setUploading(true);
    setBatchErrors([]);
    try {
      const payload = rows.map(row => ({
        ...row,
        tags: tagStringToArray(row.tagsText),
      }));
      const result = await uploadAdsBatchTable(payload);
      setDoneCount(result.uploaded || rows.length);
      setRows([]);
    } catch (err) {
      setBatchErrors(err.errors?.length ? err.errors : [err.message || 'Batch upload failed']);
    } finally {
      setUploading(false);
    }
  }

  const sidebar = <MainSidebar active="upload" />;

  return (
    <AppLayout sidebar={sidebar}>
      <div className="upload-page">
        <header className="upload-page__header">
          <button className="upload-page__back" onClick={() => navigate('/')}>← Catalog</button>
          <h1>Batch Upload</h1>
        </header>

        {rows.length === 0 && doneCount === 0 && (
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

        {rows.length > 0 && (
          <div className="upload-page__table-flow">
            <div className="upload-page__toolbar">
              <div>
                <h2>{rows.length} files ready</h2>
                <p>Fill metadata per row, or apply shared values to every row.</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".html,text/html"
                multiple
                className="upload-page__hidden-input"
                onChange={e => { handleFiles(e.target.files); e.target.value = ''; }}
              />
              <button type="button" className="btn-secondary" onClick={() => fileInputRef.current?.click()}>
                Add files
              </button>
            </div>

            <section className="upload-page__bulk">
              <select value={bulk.appId} onChange={e => setBulk(v => ({ ...v, appId: e.target.value }))}>
                <option value="">Application</option>
                {apps.map(app => <option key={app.id} value={app.id}>{app.name}</option>)}
              </select>
              <button type="button" className="btn-secondary upload-page__new-app" onClick={() => setCreatingApp(true)}>
                New Application
              </button>
              <input value={bulk.tagsText} onChange={e => setBulk(v => ({ ...v, tagsText: e.target.value }))} placeholder="tags" />
              <select value={bulk.developer} onChange={e => setBulk(v => ({ ...v, developer: e.target.value }))}>
                <option value="">Developer</option>
                {developers.map(dev => <option key={dev.id} value={dev.name}>{dev.name}</option>)}
              </select>
              <input value={bulk.repo} onChange={e => setBulk(v => ({ ...v, repo: e.target.value }))} placeholder="repo" />
              <input value={bulk.branch} onChange={e => setBulk(v => ({ ...v, branch: e.target.value }))} placeholder="branch" />
              <input value={bulk.notes} onChange={e => setBulk(v => ({ ...v, notes: e.target.value }))} placeholder="notes" />
              <button type="button" className="btn-primary upload-page__apply" onClick={applyBulk}>
                Apply to all
              </button>
            </section>

            <div className="upload-page__table-wrap">
              <table className="upload-page__table">
                <thead>
                  <tr>
                    <th>File</th>
                    <th>Title</th>
                    <th>Application</th>
                    <th>Tags</th>
                    <th>Developer</th>
                    <th>Repo</th>
                    <th>Branch</th>
                    <th>Notes</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.id} className={row.error ? 'upload-page__row--error' : ''}>
                      <td>
                        <span className="upload-page__filename">{row.filename}</span>
                        {row.error && <span className="upload-page__row-error">{row.error}</span>}
                        {row.appMatch && <span className="upload-page__row-match">Matched: {row.appMatch}</span>}
                        {!row.appId && (row.storeLinks?.ios_url || row.storeLinks?.android_url) && (
                          <span className="upload-page__row-unmatched">
                            Store link found; app is not in catalog.{' '}
                            <button type="button" onClick={() => { setPendingAppLinks({ ...row.storeLinks, rowId: row.id }); setCreatingApp(true); }}>Create app</button>
                          </span>
                        )}
                      </td>
                      <td><input value={row.title} onChange={e => updateRow(row.id, { title: e.target.value })} /></td>
                      <td>
                        <select value={row.appId} onChange={e => updateRow(row.id, { appId: e.target.value })}>
                          <option value="">Select app</option>
                          {apps.map(app => <option key={app.id} value={app.id}>{app.name}</option>)}
                        </select>
                      </td>
                      <td><input value={row.tagsText} onChange={e => updateRow(row.id, { tagsText: e.target.value })} placeholder="tag-a, tag-b" /></td>
                      <td>
                        <select value={row.developer} onChange={e => updateRow(row.id, { developer: e.target.value })}>
                          <option value="">Developer</option>
                          {developers.map(dev => <option key={dev.id} value={dev.name}>{dev.name}</option>)}
                        </select>
                      </td>
                      <td><input value={row.repo} onChange={e => updateRow(row.id, { repo: e.target.value })} placeholder="owner/repo" /></td>
                      <td><input value={row.branch} onChange={e => updateRow(row.id, { branch: e.target.value })} placeholder="main" /></td>
                      <td><textarea value={row.notes} onChange={e => updateRow(row.id, { notes: e.target.value })} rows={2} /></td>
                      <td>
                        <div className="upload-page__row-actions">
                          <button type="button" onClick={() => copyPrevious(index)} disabled={index === 0}>Copy prev</button>
                          <button type="button" onClick={() => removeRow(row.id)}>Remove</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {batchErrors.length > 0 && (
              <div className="upload-page__errors">
                <strong>Batch validation failed</strong>
                <ul>
                  {batchErrors.map((error, index) => <li key={`${error}-${index}`}>{error}</li>)}
                </ul>
              </div>
            )}

            <div className="upload-page__footer-actions">
              <button type="button" className="btn-secondary" onClick={() => { setRows([]); setBatchErrors([]); }}>
                Clear
              </button>
              <button type="button" className="btn-primary" onClick={uploadAll} disabled={uploading}>
                {uploading ? 'Uploading...' : 'Upload All'}
              </button>
            </div>
          </div>
        )}

        {doneCount > 0 && rows.length === 0 && (
          <div className="upload-page__done">
            <p className="upload-page__done-msg">
              {doneCount} playable{doneCount !== 1 ? 's' : ''} uploaded successfully.
            </p>
            <div className="upload-page__done-actions">
              <button className="btn-secondary" onClick={() => setDoneCount(0)}>Upload more</button>
              <button className="btn-primary" onClick={() => navigate('/')}>View in Catalog</button>
            </div>
          </div>
        )}

        {creatingApp && (
          <AppModal
            app={pendingAppLinks ? { ...pendingAppLinks, name: '' } : null}
            onSave={handleCreateApp}
            onClose={() => { setCreatingApp(false); setPendingAppLinks(null); }}
          />
        )}
      </div>
    </AppLayout>
  );
}
