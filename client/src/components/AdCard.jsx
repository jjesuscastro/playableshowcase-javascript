import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdCard.css';

export default function AdCard({ ad, app, onEdit, onDelete }) {
  const navigate = useNavigate();
  const [thumbError, setThumbError] = useState(false);
  const [iconError, setIconError] = useState(false);
  const showThumb = ad.thumbnail && !thumbError;
  const showIcon = app?.icon_url && !iconError;

  return (
    <div className="ad-card">
      <div className="ad-card__thumb" onClick={() => navigate(`/viewer/${ad.id}`)}>
        {showThumb ? (
          <img
            src={`/uploads/${ad.thumbnail}`}
            alt={ad.title}
            className="ad-card__thumb-img"
            onError={() => setThumbError(true)}
          />
        ) : (
          <div className="ad-card__thumb-placeholder">
            <span className="ad-card__thumb-name">{ad.title}</span>
            <span className="ad-card__thumb-hint">Open to screenshot</span>
          </div>
        )}
      </div>
      <div className="ad-card__body">
        <div className="ad-card__top-row">
          {showIcon && (
            <img
              src={app.icon_url}
              className="ad-card__app-icon"
              alt=""
              onError={() => setIconError(true)}
            />
          )}
          <div className="ad-card__top-text">
            <h3 className="ad-card__title" title={ad.title}>{ad.title}</h3>
            {app && <span className="ad-card__app">{app.name}</span>}
          </div>
        </div>
      </div>
      <div className="ad-card__actions">
        <button onClick={() => navigate(`/viewer/${ad.id}`)} title="Open viewer">▶</button>
        <button onClick={() => onEdit(ad)} title="Edit metadata">✎</button>
        <button onClick={() => onDelete(ad)} title="Delete" className="ad-card__delete">✕</button>
      </div>
    </div>
  );
}
