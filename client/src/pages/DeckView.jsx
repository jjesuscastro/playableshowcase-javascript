import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getPublicDeck } from '../api';
import AdCard from '../components/AdCard';
import DeviceFrame, { FRAMES, getFrameSize } from '../components/DeviceFrame';
import './DeckView.css';

export default function DeckView() {
  const { id } = useParams();
  const [deck, setDeck] = useState(null);
  const [error, setError] = useState(false);
  const [playingAd, setPlayingAd] = useState(null);
  const [frame, setFrame] = useState('phone');
  const [rotated, setRotated] = useState(false);
  const [muted, setMuted] = useState(false);
  const [mobilePreview, setMobilePreview] = useState(() => window.matchMedia('(max-width: 600px), (max-height: 600px) and (pointer: coarse)').matches);
  const stageRef = useRef(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    getPublicDeck(id).then(setDeck).catch(() => setError(true));
  }, [id]);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 600px), (max-height: 600px) and (pointer: coarse)');
    const update = () => setMobilePreview(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!stageRef.current) return undefined;
    const observer = new ResizeObserver(([entry]) => setStageSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, [playingAd]);

  const frameScale = useMemo(() => {
    const size = getFrameSize(frame, rotated);
    if (!stageSize.width || !stageSize.height) return 0.5;
    return Math.max(0.1, Math.min(1, (stageSize.width - 48) / size.width, (stageSize.height - 40) / size.height));
  }, [frame, rotated, stageSize]);

  if (error) return <main className="deck-public__state"><h1>Deck not found</h1><p>This link may have expired or been removed.</p></main>;
  if (!deck) return <main className="deck-public__state">Loading deck...</main>;

  return (
    <main className="deck-public">
      <header className="deck-public__header">
        <span>Playable Showcase</span>
        <h1>{deck.name}</h1>
        <p>{deck.ads.length} playable{deck.ads.length === 1 ? '' : 's'}</p>
      </header>
      <section className="deck-public__grid">
        {deck.ads.map(ad => <AdCard key={ad.id} ad={ad} app={ad.app} publicMode onOpen={setPlayingAd} />)}
      </section>
      <footer className="deck-public__footer">Shared with Playable Showcase</footer>

      {playingAd && (
        <div className="deck-public__player" role="presentation" onMouseDown={e => e.target === e.currentTarget && setPlayingAd(null)}>
          <section className="deck-public__player-panel" role="dialog" aria-modal="true" aria-label={playingAd.title}>
            <header className="deck-public__player-header">
              <h2>{playingAd.title}</h2>
              <div className="deck-public__controls">
                {Object.entries(FRAMES).map(([key, item]) => (
                  <button type="button" key={key} className={frame === key ? 'active' : ''} onClick={() => { setFrame(key); setRotated(false); }}>{item.label}</button>
                ))}
                <button type="button" className={rotated ? 'active' : ''} onClick={() => setRotated(value => !value)}>Rotate</button>
                <button type="button" className={muted ? 'active' : ''} onClick={() => setMuted(value => !value)}>{muted ? 'Unmute' : 'Mute'}</button>
                {!mobilePreview && <button type="button" onClick={() => setPlayingAd(null)}>Close</button>}
              </div>
            </header>
            {mobilePreview && <button type="button" className="deck-public__close" onClick={() => setPlayingAd(null)}>Close</button>}
            <div className={`deck-public__player-stage${mobilePreview ? ' deck-public__player-stage--fullscreen' : ''}`} ref={stageRef}>
              <div className="deck-public__frame-scale" style={{ transform: `translateX(-50%) scale(${frameScale})` }}>
                <DeviceFrame frame={frame} filename={playingAd.filename} rotated={rotated} muted={muted} fullscreen={mobilePreview} />
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
