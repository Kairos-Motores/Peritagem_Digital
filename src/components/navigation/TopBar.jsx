import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './TopBar.css';

export default function TopBar({ title, showBack = true, logoSrc, actions = [] }) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleBack = () => navigate(-1);
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const allActions = [...actions, { icon: 'logout', onClick: handleLogout, label: 'Sair' }];

  return (
    <header className={`topbar${logoSrc ? ' has-logo' : ''}`}>
      <div className="topbar-left">
        {logoSrc && (
          <img src={logoSrc} alt="Logo Kairós" className="topbar-logo" />
        )}
        {showBack && (
          <button className="topbar-icon-btn" onClick={handleBack} aria-label="Voltar">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
        )}
      </div>

      {!logoSrc && <h1 className="topbar-title">{title}</h1>}

      <div className="topbar-right">
        {allActions.map((action, i) => (
          <button
            key={i}
            className="topbar-icon-btn"
            onClick={action.onClick}
            aria-label={action.label || 'Ação'}
          >
            <span className="material-symbols-outlined">{action.icon}</span>
          </button>
        ))}
      </div>
    </header>
  );
}