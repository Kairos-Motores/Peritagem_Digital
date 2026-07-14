import { useState } from 'react';

export default function ProgressBar({ percentual, concluido, tooltip }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const cor = concluido ? '#ffffff' : 'var(--md-sys-color-primary)';
  const bgBarra = concluido ? 'rgba(255,255,255,0.3)' : 'var(--md-sys-color-surface-variant)';

  return (
    <div style={{ position: 'relative' }} onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
        <div style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: bgBarra, overflow: 'hidden' }}>
          <div style={{ width: `${percentual}%`, height: '100%', backgroundColor: cor, borderRadius: 4, transition: 'width 0.3s ease' }} />
        </div>
        <span style={{ fontSize: '0.875rem', color: cor, fontWeight: 500 }}>{percentual}%</span>
      </div>
      {showTooltip && tooltip && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 8px)',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'var(--md-sys-color-inverse-surface)',
          color: 'var(--md-sys-color-inverse-on-surface)',
          padding: '6px 12px',
          borderRadius: 8,
          fontSize: '0.75rem',
          whiteSpace: 'nowrap',
          boxShadow: 'var(--md-sys-elevation-2)',
          zIndex: 10,
          pointerEvents: 'none',
        }}>
          {tooltip}
        </div>
      )}
    </div>
  );
}