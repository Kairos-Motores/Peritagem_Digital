import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
import './TopBar.css';

export default function TopBar({ title, showBack = true, logoSrc, actions = [], onBack }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { isDark, toggleTheme, fontSize, setFontSize } = useTheme();
  const [showFontSlider, setShowFontSlider] = useState(false);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const allActions = [
    ...actions,
    // Toggle de tema
    {
      icon: isDark ? 'light_mode' : 'dark_mode',
      onClick: toggleTheme,
      label: 'Alternar tema',
    },
    // Controle de fonte
    {
      icon: 'text_fields',
      onClick: () => setShowFontSlider(!showFontSlider),
      label: 'Tamanho da fonte',
    },
    { icon: 'logout', onClick: handleLogout, label: 'Sair' },
  ];

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

      {/* Slider de tamanho de fonte (aparece abaixo dos botões) */}
      {showFontSlider && (
        <div style={{
          position: 'absolute',
          top: '56px',
          right: '16px',
          backgroundColor: 'var(--md-sys-color-surface)',
          borderRadius: 12,
          padding: '12px 16px',
          boxShadow: 'var(--md-sys-elevation-2)',
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>text_decrease</span>
          <input
            type="range"
            min="12"
            max="24"
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            style={{ width: 100 }}
          />
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>text_increase</span>
        </div>
      )}
    </header>
  );
}