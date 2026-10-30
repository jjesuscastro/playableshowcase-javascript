import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdCard.css';

export default function AdCard({ ad, app, onEdit, onDelete, selectable = false, selected = false, onToggle, publicMode = false, onOpen }) {
  const navigate = useNavigate();
  const [thumbError, setThumbError] = useState(false);
  const [iconError, setIconError] = useState(false);
  const showThumb = ad.thumbnail && !thumbError;
  const showIcon = app?.icon_url && !iconError;

  function open() {
    if (selectable) return onToggle?.(ad.id);
    if (publicMode) return onOpen?.(ad);
    navigate(`/viewer/${ad.id}`);
  }

  return (
    <div className={`playable-card${selected ? ' playable-card--selected' : ''}`}>
      <div className="playable-card__thumb" onClick={open} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && open()}>
        {showThumb ? (
          <img src={`/uploads/${ad.thumbnail}?t=${ad.updated_at}`} alt={ad.title} className="playable-card__thumb-img" onError={() => setThumbError(true)} />
        ) : (
          <div className="playable-card__thumb-placeholder">
            <span className="playable-card__thumb-name">{ad.title}</span>
            <span className="playable-card__thumb-hint">{selectable ? 'Click to select' : publicMode ? 'Click to play' : 'Open to screenshot'}</span>
          </div>
        )}
      </div>
      <div className="playable-card__body">
        <div className="playable-card__top-row">
          {showIcon && <img src={app.icon_url} className="playable-card__app-icon" alt="" onError={() => setIconError(true)} />}
          <div className="playable-card__top-text">
            <h3 className="playable-card__title" title={ad.title}>{ad.title}</h3>
            {app && <span className="playable-card__app">{app.name}</span>}
          </div>
        </div>
      </div>
      <div className="playable-card__actions">
        {selectable ? (
          <button type="button" className={selected ? 'playable-card__selected-action' : ''} onClick={() => onToggle?.(ad.id)} aria-pressed={selected} title={selected ? 'Remove from deck' : 'Add to deck'}>
            {selected ? '✓ Selected' : '+ Add to deck'}
          </button>
        ) : publicMode ? (
          <button type="button" onClick={open} title="Play">▶ Play</button>
        ) : (
          <>
            <button type="button" onClick={() => navigate(`/viewer/${ad.id}`)} title="Open viewer">▶</button>
            <button type="button" onClick={() => onEdit(ad)} title="Edit metadata">✎</button>
            <button type="button" onClick={() => onDelete(ad)} title="Delete" className="playable-card__delete">×</button>
          </>
        )}
      </div>
    </div>
  );
}
