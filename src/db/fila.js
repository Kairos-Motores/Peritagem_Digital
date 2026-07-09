import Dexie from 'dexie';

export const db = new Dexie('KairosInspecoesOffline');
db.version(1).stores({
  fila: '++id, motor_id, dados, status, created_at'
});