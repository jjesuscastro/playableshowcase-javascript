import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout } from '../api';
import './AppLayout.css';

export default function AppLayout({ sidebar, children }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="app-layout">
      <aside className={`app-sidebar${open ? ' is-open' : ''}`}>
        {sidebar}
        <div className="sb-spacer" />
        <div className="sb-footer">
          <button className="sb-btn sb-btn--logout" onClick={handleLogout}>Sign out</button>
        </div>
      </aside>

      {open && (
        <div className="app-layout__overlay" onClick={() => setOpen(false)} />
      )}

      <button
        className="app-layout__hamburger"
        onClick={() => setOpen(o => !o)}
        aria-label="Toggle menu"
      >
        ☰
      </button>

      <div className="app-layout__main">{children}</div>
    </div>
  );
}
