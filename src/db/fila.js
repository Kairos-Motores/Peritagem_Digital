import Dexie from 'dexie';

export const db = new Dexie('KairosInspecoesOffline');

db.version(3).stores({
  fila: '++id, motor_id, dados, status, created_at',
  inspecoes: '++id, os, cabecalho, respostas, fotos, status, created_at',
  modelo: '++id, cr4a1_item',
});

// v4: cache offline da lista de modelos de peritagem (cr4a1_peritagem_modelo)
db.version(4).stores({
  fila: '++id, motor_id, dados, status, created_at',
  inspecoes: '++id, os, cabecalho, respostas, fotos, status, created_at',
  modelo: '++id, cr4a1_item',
  modelos_peritagem: 'cr4a1_peritagem_modeloid, cr4a1_id',
});

// v5: cache offline do glossário de termos BR/PT (filial Aveiro)
db.version(5).stores({
  fila: '++id, motor_id, dados, status, created_at',
  inspecoes: '++id, os, cabecalho, respostas, fotos, status, created_at',
  modelo: '++id, cr4a1_item',
  modelos_peritagem: 'cr4a1_peritagem_modeloid, cr4a1_id',
  glossario_termos: 'cr4a1_glossariotermoid, cr4a1_termobr',
});