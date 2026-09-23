import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
import './TopBar.css';

export default function TopBar({ title, showBack = true, logoSrc, actions = [], onBack }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { isDark, toggleTheme, fontSize, setFontSize } = useTheme();
  const [showFontSlider, setShowFontSlider] = useState(false);
  const [confirmandoLogout, setConfirmandoLogout] = useState(false);

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
    { icon: 'logout', onClick: () => setConfirmandoLogout(true), label: 'Sair' },
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

      {confirmandoLogout &&
        createPortal(
          <AnimatePresence>
            <motion.div
              onClick={() => setConfirmandoLogout(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'fixed', inset: 0, zIndex: 5000, padding: 24,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
              }}
            >
              <motion.div
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.85, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85, y: 30 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                style={{
                  width: '100%', maxWidth: 340,
                  backgroundColor: 'var(--md-sys-color-surface)', color: 'var(--md-sys-color-on-surface)',
                  borderRadius: 'var(--md-sys-shape-corner-large)', padding: 24,
                  boxShadow: 'var(--md-sys-elevation-3)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 26, color: 'var(--md-sys-color-error)' }}>logout</span>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Sair da conta?</h3>
                </div>
                <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                  Você vai precisar entrar de novo para continuar. Peritagens já salvas não são perdidas.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setConfirmandoLogout(false)}
                    style={{
                      flex: 1, padding: '10px 0', borderRadius: 'var(--md-sys-shape-corner-medium)',
                      border: '1px solid var(--md-sys-color-outline)', background: 'transparent',
                      color: 'var(--md-sys-color-on-surface)', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleLogout}
                    style={{
                      flex: 1, padding: '10px 0', borderRadius: 'var(--md-sys-shape-corner-medium)',
                      border: 'none', background: 'var(--md-sys-color-error)', color: '#fff',
                      cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                    }}
                  >
                    Sair
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>,
          document.body
        )}
    </header>
  );
}