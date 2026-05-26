import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import AppModal from '../components/AppModal';
import { createApp, deleteApp, listApps, updateApp } from '../api';
import './Apps.css';

export default function Apps() {
  const navigate = useNavigate();
  const [apps, setApps] = useState([]);
  const [editingApp, setEditingApp] = useState(null);

  useEffect(() => { load(); }, []);

  function sortByName(list) {
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }

  async function load() {
    setApps(sortByName(await listApps()));
  }

  async function handleSave(data) {
    if (editingApp === 'new') {
      const created = await createApp(data);
      setApps(prev => sortByName([created, ...prev]));
    } else {
      const updated = await updateApp(editingApp.id, data);
      setApps(prev => sortByName(prev.map(a => a.id === updated.id ? updated : a)));
    }
    setEditingApp(null);
  }

  async function handleDelete(app) {
    if (!confirm(`Delete "${app.name}"? Playables linked to it will become unlinked.`)) return;
    await deleteApp(app.id);
    setApps(prev => prev.filter(a => a.id !== app.id));
  }

  const sidebar = (
    <>
      <div className="sb-brand">Playable Showcase</div>
      <div className="sb-nav">
        <button className="sb-btn sb-btn--primary" onClick={() => setEditingApp('new')}>+ New Application</button>
        <button className="sb-btn" onClick={() => navigate('/')}>← Catalog</button>
      </div>
    </>
  );

  return (
    <AppLayout sidebar={sidebar}>
      <div className="apps-page">
        <h1 className="apps-page__title">Applications</h1>

        {apps.length === 0 && (
          <p className="apps-page__empty">No applications yet. Create one to start organizing playables.</p>
        )}

        <div className="apps-page__list">
          {apps.map(app => (
            <div key={app.id} className="app-row">
              {app.icon_url
                ? <img src={app.icon_url} alt={app.name} className="app-row__icon" onError={e => { e.target.style.display = 'none'; }} />
                : <div className="app-row__icon-placeholder" />
              }
              <div className="app-row__info">
                <span className="app-row__name">{app.name}</span>
                <div className="app-row__links">
                  {app.ios_url
                    ? <a href={app.ios_url} target="_blank" rel="noopener noreferrer" className="app-row__store app-row__store--ios">iOS</a>
                    : <span className="app-row__store app-row__store--missing">No iOS link</span>
                  }
                  {app.android_url
                    ? <a href={app.android_url} target="_blank" rel="noopener noreferrer" className="app-row__store app-row__store--android">Android</a>
                    : <span className="app-row__store app-row__store--missing">No Android link</span>
                  }
                </div>
              </div>
              <div className="app-row__actions">
                <button onClick={() => setEditingApp(app)}>✎ Edit</button>
                <button onClick={() => handleDelete(app)} className="app-row__delete">✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editingApp && (
        <AppModal
          app={editingApp === 'new' ? null : editingApp}
          onSave={handleSave}
          onClose={() => setEditingApp(null)}
        />
      )}
    </AppLayout>
  );
}
