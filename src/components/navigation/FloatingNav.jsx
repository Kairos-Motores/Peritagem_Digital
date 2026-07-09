import { useLocation, useNavigate } from 'react-router-dom';
import MdIcon from '../ui/MdIcon';
import './FloatingNav.css';

const tabs = [
  {
    path: '/home',
    label: 'Início',
    icon: 'home',
    activeIcon: 'home', // poderia ser 'home_filled'
  },
  {
    path: '/nova',
    label: 'Inspeção',
    icon: 'add_circle',
    activeIcon: 'add_circle',
  },
  {
    path: '/historico',
    label: 'Histórico',
    icon: 'history',
    activeIcon: 'history',
  },
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
              <MdIcon className={`nav-icon ${isActive ? 'filled' : 'outlined'}`}>
                {isActive ? tab.activeIcon : tab.icon}
              </MdIcon>
              <span className="nav-label">{tab.label}</span>
              {isActive && <span className="active-indicator" />}
            </button>
          );
        })}
      </nav>
    </div>
  );
}