import { useState } from 'react';
import './FloatingActionButton.css';

export default function FloatingActionButton({ label = 'Create', actions = [] }) {
  const [open, setOpen] = useState(false);
  const hasMenu = actions.length > 1;

  function run(action) {
    setOpen(false);
    action.onClick();
  }

  return (
    <div className="fab">
      {hasMenu && open && (
        <div className="fab__menu">
          {actions.map(action => (
            <button key={action.label} type="button" className="fab__item" onClick={() => run(action)}>
              <span>{action.label}</span>
              {action.description && <small>{action.description}</small>}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        className="fab__button"
        aria-label={label}
        aria-expanded={hasMenu ? open : undefined}
        onClick={() => hasMenu ? setOpen(value => !value) : run(actions[0])}
      >
        +
      </button>
    </div>
  );
}
