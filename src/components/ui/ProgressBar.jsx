export default function ProgressBar({ percentual, concluido }) {
  const cor = concluido ? '#ffffff' : 'var(--md-sys-color-primary)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
      <div style={{
        flex: 1,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'var(--md-sys-color-surface-variant)',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${percentual}%`,
          height: '100%',
          backgroundColor: cor,
          transition: 'width 0.3s ease',
        }} />
      </div>
      <span style={{ fontSize: '0.875rem', color: cor }}>{percentual}%</span>
    </div>
  );
}