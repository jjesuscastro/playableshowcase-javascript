import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import AdCard from '../components/AdCard';
import MainSidebar from '../components/MainSidebar';
import { createDeck, deleteDeck, listAds, listApps, listDecks } from '../api';
import './Decks.css';

export default function Decks() {
  const navigate = useNavigate();
  const [ads, setAds] = useState([]);
  const [apps, setApps] = useState([]);
  const [decks, setDecks] = useState([]);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState('');

  useEffect(() => {
    listAds().then(setAds).catch(() => setError('Could not load playables.'));
    listApps().then(setApps).catch(() => {});
    listDecks().then(setDecks).catch(() => setError('Could not load decks.'));
  }, []);

  const adsById = useMemo(() => new Map(ads.map(ad => [ad.id, ad])), [ads]);
  const appsById = useMemo(() => new Map(apps.map(app => [app.id, app])), [apps]);
  const shareUrl = id => `${window.location.origin}/deck/${id}`;

  function toggleAd(id) {
    setSelected(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  }

  async function handleCreate(event) {
    event.preventDefault();
    setError('');
    if (!name.trim()) { setError('Enter a deck name.'); return; }
    if (!selected.length) { setError('Choose at least one playable.'); return; }
    setSaving(true);
    try {
      const deck = await createDeck({ name: name.trim(), adIds: selected });
      setDecks(prev => [deck, ...prev]);
      setName('');
      setSelected([]);
    } catch (err) {
      setError(err.message || 'Could not create deck.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy(deck) {
    await navigator.clipboard.writeText(shareUrl(deck.id));
    setCopiedId(deck.id);
    setTimeout(() => setCopiedId(''), 1800);
  }

  async function handleDelete(deck) {
    if (!confirm(`Delete deck “${deck.name}”? Its share link will stop working.`)) return;
    try {
      await deleteDeck(deck.id);
      setDecks(prev => prev.filter(item => item.id !== deck.id));
    } catch (err) {
      setError(err.message || 'Could not delete deck.');
    }
  }

  return (
    <AppLayout sidebar={<MainSidebar active="decks" />}>
      <main className="decks-page">
        <header className="decks-page__header">
          <button type="button" className="decks-page__back" onClick={() => navigate('/')}>← Catalog</button>
          <div><h1>Decks</h1><p>Build a shareable collection from selected playables.</p></div>
        </header>

        <form className="deck-create" onSubmit={handleCreate}>
          <div className="deck-create__heading">
            <h2>Create a deck</h2>
            <span>{selected.length} selected</span>
          </div>
          <label className="deck-create__name">Deck name<input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Q4 campaign review" /></label>
          <div className="deck-create__selection catalog__grid">
            {ads.length === 0 && <p className="decks-page__empty">Upload playables before creating a deck.</p>}
            {ads.map(ad => (
              <AdCard key={ad.id} ad={ad} app={appsById.get(ad.appId)} selectable selected={selected.includes(ad.id)} onToggle={toggleAd} />
            ))}
          </div>
          {error && <p className="decks-page__error">{error}</p>}
          <button className="btn-primary" type="submit" disabled={saving || ads.length === 0}>{saving ? 'Creating…' : 'Create deck and link'}</button>
        </form>

        <section className="deck-list">
          <h2>Your decks</h2>
          {decks.length === 0 && <p className="decks-page__empty">No decks created yet.</p>}
          {decks.map(deck => {
            const count = deck.adIds.filter(id => adsById.has(id)).length;
            return (
              <article className="deck-item" key={deck.id}>
                <div><h3>{deck.name}</h3><span>{count} playable{count === 1 ? '' : 's'}</span></div>
                <input className="deck-item__url" readOnly value={shareUrl(deck.id)} onFocus={e => e.target.select()} />
                <a href={`/deck/${deck.id}`} target="_blank" rel="noreferrer">Open</a>
                <button type="button" className="btn-secondary" onClick={() => handleCopy(deck)}>{copiedId === deck.id ? 'Copied' : 'Copy link'}</button>
                <button type="button" className="deck-item__delete" onClick={() => handleDelete(deck)}>Delete</button>
              </article>
            );
          })}
        </section>
      </main>
    </AppLayout>
  );
}
