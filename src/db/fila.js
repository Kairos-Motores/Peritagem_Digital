import Dexie from 'dexie';

export const db = new Dexie('KairosInspecoesOffline');

db.version(3).stores({
  fila: '++id, motor_id, dados, status, created_at',
  inspecoes: '++id, os, cabecalho, respostas, fotos, status, created_at',
  modelo: '++id, cr4a1_item',
});