import { useContext } from 'react';
import { SyncContext } from '../../contexts/SyncContext';

export default function SyncStatus() {
  const { pendentes, comErro, sincronizar, isOnline } = useContext(SyncContext);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0' }}>
      <span className="material-symbols-outlined" style={{ color: comErro > 0 ? 'var(--md-sys-color-error)' : isOnline ? 'green' : 'gray' }}>
        {comErro > 0 ? 'sync_problem' : isOnline ? 'wifi' : 'wifi_off'}
      </span>
      {pendentes > 0 ? (
        <span>
          {pendentes} inspeção{pendentes !== 1 ? 'ões' : ''} pendente{pendentes !== 1 ? 's' : ''}
          {comErro > 0 && (
            <span style={{ color: 'var(--md-sys-color-error)' }}> ({comErro} com erro, tentando de novo)</span>
          )}
        </span>
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