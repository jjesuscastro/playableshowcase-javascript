import { useNavigate } from 'react-router-dom';

export default function MainSidebar({
  active = '',
  children,
  apps = [],
  activeAppId = null,
  search = '',
  onSearch,
  onFilterApp,
}) {
  const navigate = useNavigate();
  const showCatalogTools = active === 'catalog';

  return (
    <>
      <div className="sb-brand">
        <img className="sb-brand__logo" src="/hpl-white-logo.png" alt="HPL Game Design" />
        <span className="sb-brand__product">PLAYABLE SHOWCASE</span>
      </div>

      <div className="sb-nav">
        <button className={`sb-btn${active === 'catalog' ? ' sb-btn--active' : ''}`} onClick={() => navigate('/')}>Catalog</button>
        <button className={`sb-btn${active === 'upload' ? ' sb-btn--active' : ''}`} onClick={() => navigate('/upload')}>Batch Upload</button>
        <button className={`sb-btn${active === 'decks' ? ' sb-btn--active' : ''}`} onClick={() => navigate('/decks')}>Decks</button>
        <button className={`sb-btn${active === 'apps' ? ' sb-btn--active' : ''}`} onClick={() => navigate('/apps')}>Applications</button>
        <button className={`sb-btn${active === 'settings' ? ' sb-btn--active' : ''}`} onClick={() => navigate('/settings')}>Settings</button>
      </div>

      {children}

      {showCatalogTools && (
        <>
          <div className="sb-divider" />
          <div className="catalog__search-wrap">
            <input
              className="catalog__search"
              type="search"
              placeholder="Search..."
              value={search}
              onChange={e => onSearch?.(e.target.value)}
            />
          </div>

          {apps.length > 0 && (
            <>
              <div className="sb-divider" />
              <span className="sb-section-label">Filter by App</span>
              <div className="sb-nav" style={{ paddingTop: 0 }}>
                <button
                  className={`sb-btn${activeAppId === null ? ' sb-btn--active' : ''}`}
                  onClick={() => onFilterApp?.(null)}
                >
                  All
                </button>
                {apps.map(a => (
                  <button
                    key={a.id}
                    className={`sb-btn${activeAppId === a.id ? ' sb-btn--active' : ''}`}
                    onClick={() => onFilterApp?.(a.id)}
                  >
                    {a.icon_url
                      ? <img src={a.icon_url} className="sb-app-icon" alt="" onError={e => { e.target.style.display = 'none'; }} />
                      : <div className="sb-app-icon-placeholder" />
                    }
                    {a.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
