import { createContext, useState, useEffect, useCallback } from 'react';
import { db } from '../db/fila';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { toast } from 'react-toastify';

export const SyncContext = createContext();

export function SyncProvider({ children }) {
  const [pendentes, setPendentes] = useState(0);
  const isOnline = useNetworkStatus();
  const token = sessionStorage.getItem('dv_token');

  const atualizarContagem = useCallback(async () => {
    const countFila = await db.fila.where('status').equals('pendente').count();
    const countInspecoes = await db.inspecoes.where('status').equals('pendente').count();
    setPendentes(countFila + countInspecoes);
  }, []);

  const sincronizar = useCallback(async () => {
    if (!token) return;

    // Sincroniza fila antiga (se ainda existir)
    const itensFila = await db.fila.where('status').equals('pendente').toArray();
    for (const item of itensFila) {
      try {
        await sendInspecaoViaFetch(item.dados); // precisa da função abaixo
        await db.fila.delete(item.id);
      } catch {
        await db.fila.update(item.id, { status: 'erro' });
      }
    }

    // Sincroniza inspeções completas offline
    const itensInspecoes = await db.inspecoes.where('status').equals('pendente').toArray();
    if (itensInspecoes.length === 0 && itensFila.length === 0) return;

    const toastId = toast.loading(`Sincronizando ${itensInspecoes.length + itensFila.length} inspeção(ões)...`, {
      autoClose: false,
      closeOnClick: false,
      closeButton: false,
    });

    for (const inspecao of itensInspecoes) {
      try {
        // 1. Criar cabeçalho
        const cabRes = await fetch(`${import.meta.env.VITE_API_URL}/dataverse`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            method: 'POST',
            path: `/cr4a1_peritagem_cabecalhoes`, // entity set name correto
            body: { ...inspecao.cabecalho, cr4a1_data_peritagem: new Date().toISOString(), cr4a1_status: 'Em andamento' },
            options: { atualizarDataInicio: true },
          }),
        });
        if (!cabRes.ok) throw new Error('Falha ao criar cabeçalho');

        // 2. Salvar respostas (checklist)
        if (inspecao.respostas) {
          for (const [itemId, resposta] of Object.entries(inspecao.respostas)) {
            const quantString = Object.entries(resposta.quantidades).map(([op, qty]) => `${op}:${qty}`).join(';');
            await fetch(`${import.meta.env.VITE_API_URL}/dataverse`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                method: 'POST',
                path: `/cr4a1_peritagem_b04s`, // entity set name correto
                body: {
                  cr4a1_os: inspecao.os,
                  cr4a1_item: resposta.item_id,
                  cr4a1_descricao: resposta.descricao,
                  cr4a1_observacao: resposta.observacao,
                  cr4a1_var_quant: quantString,
                },
              }),
            });
          }
        }

        // 3. Upload de fotos
        if (inspecao.fotos && inspecao.fotos.length > 0) {
          for (const foto of inspecao.fotos) {
            await fetch(`${import.meta.env.VITE_API_URL}/upload-foto`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ os: inspecao.os, fotoBase64: foto.base64, nomeArquivo: foto.nomeArquivo }),
            });
          }
        }

        // Remove da fila
        await db.inspecoes.delete(inspecao.id);
      } catch (err) {
        console.error('Erro ao sincronizar inspeção offline:', err);
        await db.inspecoes.update(inspecao.id, { status: 'erro' });
      }
    }

    toast.dismiss(toastId);
    toast.success('Sincronização concluída!');
    await atualizarContagem();
  }, [token, atualizarContagem]);

  // Função auxiliar para enviar inspeção da fila antiga (caso ainda existam itens lá)
  const sendInspecaoViaFetch = async (dadosString) => {
    const inspecao = JSON.parse(dadosString);
    const res = await fetch(`${import.meta.env.VITE_API_URL}/dataverse`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        method: 'POST',
        path: '/kairos_inspecoes', // adapte se necessário
        body: inspecao,
      }),
    });
    if (!res.ok) throw new Error('Falha ao enviar inspeção antiga');
  };

  useEffect(() => {
    if (isOnline && pendentes > 0) {
      sincronizar();
    }
  }, [isOnline, pendentes, sincronizar]);

  useEffect(() => {
    atualizarContagem();
  }, [atualizarContagem]);

  return (
    <SyncContext.Provider value={{ pendentes, sincronizar, isOnline }}>
      {children}
    </SyncContext.Provider>
  );
}