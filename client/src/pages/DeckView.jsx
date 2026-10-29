import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getPublicDeck } from '../api';
import AdCard from '../components/AdCard';
import './DeckView.css';

export default function DeckView() {
  const { id } = useParams();
  const [deck, setDeck] = useState(null);
  const [error, setError] = useState(false);
  const [playingAd, setPlayingAd] = useState(null);

  useEffect(() => {
    getPublicDeck(id).then(setDeck).catch(() => setError(true));
  }, [id]);

  if (error) return <main className="deck-public__state"><h1>Deck not found</h1><p>This link may have expired or been removed.</p></main>;
  if (!deck) return <main className="deck-public__state">Loading deck…</main>;

  return (
    <main className="deck-public">
      <header className="deck-public__header">
        <span>Playable Showcase</span>
        <h1>{deck.name}</h1>
        <p>{deck.ads.length} playable{deck.ads.length === 1 ? '' : 's'}</p>
      </header>
      <section className="deck-public__grid">
        {deck.ads.map(ad => (
          <AdCard key={ad.id} ad={ad} app={ad.app} publicMode onOpen={setPlayingAd} />
        ))}
      </section>
      <footer className="deck-public__footer">Shared with Playable Showcase</footer>
      {playingAd && (
        <div className="deck-public__player" role="presentation" onMouseDown={e => e.target === e.currentTarget && setPlayingAd(null)}>
          <section className="deck-public__player-panel" role="dialog" aria-modal="true" aria-label={playingAd.title}>
            <header><h2>{playingAd.title}</h2><button type="button" onClick={() => setPlayingAd(null)} aria-label="Close playable">×</button></header>
            <iframe src={`/uploads/${encodeURIComponent(playingAd.filename)}`} title={playingAd.title} sandbox="allow-scripts allow-forms" />
          </section>
        </div>
      )}
    </main>
  );
}
