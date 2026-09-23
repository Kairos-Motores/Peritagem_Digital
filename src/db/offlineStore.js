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

// Retorna todas as inspecções que ainda precisam sincronizar — inclui
// 'erro' de propósito, senão uma inspeção que falhou uma vez (rede caiu
// no meio do envio, token expirou etc.) nunca mais seria tentada de novo
// e sumiria silenciosamente da contagem de pendentes.
export async function listarPendentes() {
  return await db.inspecoes.where('status').anyOf(['pendente', 'erro']).toArray();
}

// Remove uma inspecção do IndexedDB (após sincronizar)
export async function removerInspecao(id) {
  return await db.inspecoes.delete(id);
}

// Marca uma inspecção como erro, guardando a mensagem e contando tentativas
// (fica disponível pra próxima chamada de listarPendentes tentar de novo).
export async function marcarErro(id, mensagem) {
  const atual = await db.inspecoes.get(id);
  return await db.inspecoes.update(id, {
    status: 'erro',
    ultimo_erro: mensagem || null,
    tentativas: (atual?.tentativas || 0) + 1,
  });
}

// Atualiza campos específicos de uma inspeção (usado pela sincronização
// pra ir marcando o que já foi enviado com sucesso — cabeçalho criado,
// resposta ou foto já confirmada — assim uma nova tentativa depois de uma
// falha parcial não reenvia o que já chegou no Dataverse).
export async function atualizarInspecaoOffline(id, patch) {
  return await db.inspecoes.update(id, { ...patch, updated_at: new Date().toISOString() });
}

// Retorna uma inspecção específica pela OS
export async function obterInspecaoPorOS(os) {
  return await db.inspecoes.where({ os }).first();
}