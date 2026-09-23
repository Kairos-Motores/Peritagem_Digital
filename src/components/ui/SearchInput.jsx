export default function SearchInput({ value, onChange, placeholder = 'Pesquisar...' }) {
  return (
    <div style={{ position: 'relative', marginBottom: 16 }}>
      <span
        className="material-symbols-outlined"
        style={{ position: 'absolute', left: 12, top: 10, color: 'var(--md-sys-color-on-surface-variant)', fontSize: 20 }}
      >
        search
      </span>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '10px 12px 10px 38px',
          borderRadius: 28,
          border: '1px solid var(--md-sys-color-outline)',
          backgroundColor: 'var(--md-sys-color-surface-variant)',
          color: 'var(--md-sys-color-on-surface)',
          fontSize: '0.9rem',
          outline: 'none',
          transition: 'border-color 0.2s',
        }}
      />
    </div>
  );
}
