import { db } from './fila';

// Guarda ou atualiza uma inspeção completa no IndexedDB
export async function salvarInspecaoOffline(dados) {
  const existente = await db.inspecoes.where({ os: dados.os }).first();
  if (existente) {
    await db.inspecoes.update(existente.id, { ...dados, status: 'pendente', updated_at: new Date().toISOString() });
    return existente.id;
  } else {
    const id = await db.inspecoes.add({ ...dados, status: 'pendente', created_at: new Date().toISOString() });
    return id;
  }
}

// Retorna todas as inspecções pendentes (para sincronizar)
export async function listarPendentes() {
  return await db.inspecoes.where('status').equals('pendente').toArray();
}

// Remove uma inspecção do IndexedDB (após sincronizar)
export async function removerInspecao(id) {
  return await db.inspecoes.delete(id);
}

// Marca uma inspecção como erro
export async function marcarErro(id) {
  return await db.inspecoes.update(id, { status: 'erro' });
}

// Retorna uma inspecção específica pela OS
export async function obterInspecaoPorOS(os) {
  return await db.inspecoes.where({ os }).first();
}