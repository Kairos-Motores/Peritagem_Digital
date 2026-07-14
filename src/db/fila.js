import Dexie from 'dexie';

export const db = new Dexie('KairosInspecoesOffline');
db.version(2).stores({
  fila: '++id, motor_id, dados, status, created_at', // tabela antiga (pode manter)
  inspecoes: '++id, os, cabecalho, respostas, fotos, status, created_at', // nova
});