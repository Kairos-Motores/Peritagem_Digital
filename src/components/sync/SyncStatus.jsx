import { useContext } from 'react';
import { SyncContext } from '../../contexts/SyncContext';

export default function SyncStatus() {
  const { pendentes, sincronizar, isOnline } = useContext(SyncContext);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0' }}>
      <span className="material-symbols-outlined" style={{ color: isOnline ? 'green' : 'gray' }}>
        {isOnline ? 'wifi' : 'wifi_off'}
      </span>
      {pendentes > 0 ? (
        <span>{pendentes} inspeção{pendentes !== 1 ? 'ões' : ''} pendente{pendentes !== 1 ? 's' : ''}</span>
      ) : (
        <span>Tudo sincronizado</span>
      )}
      {isOnline && pendentes > 0 && (
        <button
          onClick={sincronizar}
          style={{
            background: 'none',
            border: '1px solid var(--md-sys-color-outline)',
            borderRadius: 8,
            padding: '2px 10px',
            cursor: 'pointer',
            fontSize: '0.8rem',
          }}
        >
          Sincronizar agora
        </button>
      )}
    </div>
  );
}