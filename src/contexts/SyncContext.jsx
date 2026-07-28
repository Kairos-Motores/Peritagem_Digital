import { createContext, useState, useEffect, useCallback } from 'react';
import { listarPendentes, removerInspecao, marcarErro } from '../db/offlineStore';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { toast } from 'react-toastify';

export const SyncContext = createContext();

export function SyncProvider({ children }) {
  const [pendentes, setPendentes] = useState(0);
  const isOnline = useNetworkStatus();
  const token = sessionStorage.getItem('dv_token');

  const atualizarContagem = useCallback(async () => {
    const lista = await listarPendentes();
    setPendentes(lista.length);
  }, []);

  const sincronizar = useCallback(async () => {
    if (!token || !isOnline) return;
    const inspecoes = await listarPendentes();
    if (inspecoes.length === 0) return;

    const toastId = toast.loading(`Sincronizando ${inspecoes.length} inspeção(ões)...`, { autoClose: false });

    for (const inspecao of inspecoes) {
      try {
        // 1. Criar cabeçalho (se não tiver ID do Dataverse)
        if (!inspecao.cabecalho?.cr4a1_peritagem_cabecalhoid) {
          const cabRes = await fetch(`${import.meta.env.VITE_API_URL}/dataverse`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              method: 'POST',
              path: `/cr4a1_peritagem_cabecalhoes`,
              body: { ...inspecao.cabecalho, cr4a1_data_peritagem: new Date().toISOString(), cr4a1_status: 'Em andamento' },
              options: { atualizarDataInicio: true },
            }),
          });
          if (!cabRes.ok) throw new Error('Falha ao criar cabeçalho');
        }

        // 2. Respostas do checklist
        if (inspecao.respostas) {
          for (const [itemId, resposta] of Object.entries(inspecao.respostas)) {
            const quantString = Object.entries(resposta.quantidades).map(([op, qty]) => `${op}:${qty}`).join(';');
            await fetch(`${import.meta.env.VITE_API_URL}/dataverse`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                method: 'POST',
                path: `/cr4a1_peritagem_b04s`,
                body: {
                  cr4a1_os: inspecao.os,
                  cr4a1_item: resposta.item_id,
                  cr4a1_descricao: resposta.descricao,
                  cr4a1_observacao: resposta.observacao,
                  cr4a1_var_quant: quantString,
                  cr4a1_tipo: resposta.tipo,
                  cr4a1_peritador: resposta.peritador,
                  cr4a1_referencia: JSON.stringify(resposta.referencia || {}),
                },
              }),
            });
          }
        }

        // 3. Fotos
        if (inspecao.fotos?.length > 0) {
          for (const foto of inspecao.fotos) {
            await fetch(`${import.meta.env.VITE_API_URL}/upload-foto`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ os: inspecao.os, fotoBase64: foto.base64, nomeArquivo: foto.nomeArquivo }),
            });
          }
        }

        await removerInspecao(inspecao.id);
      } catch (err) {
        console.error('Erro ao sincronizar:', err);
        await marcarErro(inspecao.id);
      }
    }

    toast.dismiss(toastId);
    toast.success('Sincronização concluída!');
    await atualizarContagem();
  }, [token, isOnline, atualizarContagem]);

  useEffect(() => { atualizarContagem(); }, [atualizarContagem]);

  useEffect(() => {
    if (isOnline) { sincronizar(); }
  }, [isOnline]);

  return (
    <SyncContext.Provider value={{ pendentes, sincronizar, isOnline }}>
      {children}
    </SyncContext.Provider>
  );
}