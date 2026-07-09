import { useContext } from 'react';
import { SyncContext } from '../../contexts/SyncContext';

export default function SyncStatus() {
  const { pendentes, isOnline } = useContext(SyncContext);

  return (
    <div style={{ margin: '8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
      <md-icon style={{ color: isOnline ? 'green' : 'gray' }}>
        {isOnline ? 'wifi' : 'wifi_off'}
      </md-icon>
      <span>{pendentes > 0 ? `${pendentes} inspeções pendentes` : 'Tudo sincronizado'}</span>
    </div>
  );
}