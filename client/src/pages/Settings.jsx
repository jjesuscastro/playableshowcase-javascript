import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { addDeveloper, listDevelopers, removeDeveloper } from '../api';
import './Settings.css';

export default function Settings() {
  const navigate = useNavigate();
  const [developers, setDevelopers] = useState([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    listDevelopers().then(setDevelopers).catch(() => {});
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    const name = input.trim();
    if (!name) return;
    setError('');
    setAdding(true);
    try {
      const dev = await addDeveloper(name);
      setDevelopers(prev => [...prev, dev].sort((a, b) => a.name.localeCompare(b.name)));
      setInput('');
    } catch (err) {
      setError(err.message || 'Failed to add developer');
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(dev) {
    if (!confirm(`Remove "${dev.name}" from the developer list?`)) return;
    await removeDeveloper(dev.id);
    setDevelopers(prev => prev.filter(d => d.id !== dev.id));
  }

  const sidebar = (
    <>
      <div className="sb-brand">Playable Showcase</div>
      <div className="sb-nav">
        <button className="sb-btn" onClick={() => navigate('/')}>← Catalog</button>
      </div>
    </>
  );

  return (
    <AppLayout sidebar={sidebar}>
      <div className="settings-page">
        <h1 className="settings-page__title">Settings</h1>

        <section className="settings-section">
          <h2 className="settings-section__title">Developers</h2>
          <p className="settings-section__desc">Manage the list of developers shown in upload and edit forms.</p>

          <form className="settings-add-row" onSubmit={handleAdd}>
            <input
              className="settings-add-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Last, First"
            />
            <button type="submit" className="btn-primary settings-add-btn" disabled={adding || !input.trim()}>
              {adding ? 'Adding…' : '+ Add'}
            </button>
          </form>
          {error && <p className="settings-error">{error}</p>}

          <ul className="settings-dev-list">
            {developers.map(dev => (
              <li key={dev.id} className="settings-dev-row">
                <span className="settings-dev-name">{dev.name}</span>
                <button
                  type="button"
                  className="settings-dev-remove"
                  onClick={() => handleRemove(dev)}
                  title="Remove"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppLayout>
  );
}
