import { useState } from 'react';
import './AppLayout.css';

export default function AppLayout({ sidebar, children }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="app-layout">
      <aside className={`app-sidebar${open ? ' is-open' : ''}`}>
        {sidebar}
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
