import { useLocation, useNavigate } from 'react-router-dom';
import './FloatingNav.css';

const tabs = [
  { path: '/home', label: 'Início', icon: 'home' },
  { path: '/nova', label: 'Inspeção', icon: 'add_circle' },
  { path: '/historico', label: 'Histórico', icon: 'history' },
];

export default function FloatingNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="floating-nav-container">
      <nav className="floating-nav">
        {tabs.map(tab => {
          const isActive = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              className={`nav-button ${isActive ? 'active' : ''}`}
              onClick={() => navigate(tab.path)}
              aria-label={tab.label}
            >
              <span
                className="material-symbols-outlined nav-icon"
                style={{
                  fontVariationSettings: `'FILL' ${isActive ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24`,
                  fontSize: 26,
                  transition: 'all 0.2s',
                }}
              >
                {tab.icon}
              </span>
              <span className="nav-label">{tab.label}</span>
              {isActive && <span className="active-indicator" />}
            </button>
          );
        })}
      </nav>
    </div>
  );
}