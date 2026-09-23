import { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { listarPendentes, removerInspecao, marcarErro, atualizarInspecaoOffline } from '../db/offlineStore';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { toast } from 'react-toastify';

export const SyncContext = createContext();

export function SyncProvider({ children }) {
  const [pendentes, setPendentes] = useState(0);
  const [comErro, setComErro] = useState(0);
  const isOnline = useNetworkStatus();
  const token = sessionStorage.getItem('dv_token');
  // Trava simples contra sincronizações concorrentes (voltar a ficar online
  // e clicar em "Sincronizar agora" quase ao mesmo tempo, por exemplo) —
  // sem isso, duas chamadas simultâneas percorreriam a mesma fila e
  // duplicariam o que já tivesse ido com sucesso.
  const emAndamentoRef = useRef(false);

  const atualizarContagem = useCallback(async () => {
    const lista = await listarPendentes();
    setPendentes(lista.length);
    setComErro(lista.filter(i => i.status === 'erro').length);
  }, []);

  const callDataverse = useCallback(async (method, path, body, options) => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/dataverse`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ method, path, body, options }),
    });
    if (!res.ok) {
      let msg = `Erro ${res.status}`;
      try { const data = await res.json(); msg = data?.error?.message || data?.message || msg; } catch { /* resposta sem corpo JSON */ }
      throw new Error(msg);
    }
    if (res.status === 204 || res.headers.get('content-length') === '0') return undefined;
    try { return await res.json(); } catch { return undefined; }
  }, [token]);

  const sincronizar = useCallback(async () => {
    if (!token || !isOnline || emAndamentoRef.current) return;
    emAndamentoRef.current = true;
    try {
      const inspecoes = await listarPendentes();
      if (inspecoes.length === 0) return;

      const toastId = toast.loading(`Sincronizando ${inspecoes.length} inspeção(ões)...`, { autoClose: false });
      let falharam = 0;

      for (const inspecao of inspecoes) {
        try {
          // 1. Cabeçalho — só cria se ainda não tiver ID do Dataverse. Isso
          // (junto com o checkpoint logo abaixo) evita duplicar o registro
          // numa nova tentativa depois de uma falha parcial.
          let cabecalho = inspecao.cabecalho;
          if (cabecalho && !cabecalho.cr4a1_peritagem_cabecalhoid) {
            await callDataverse(
              'POST',
              '/cr4a1_peritagem_cabecalhoes',
              { ...cabecalho, cr4a1_data_peritagem: new Date().toISOString(), cr4a1_status: 'Em andamento' },
              { atualizarDataInicio: true }
            );
            // O Dataverse não devolve o registro criado no POST — busca o
            // ID pela OS, igual ao fluxo online (useDataverse.createCabecalho).
            const busca = await callDataverse('GET', `/cr4a1_peritagem_cabecalhoes?$filter=cr4a1_os eq '${encodeURIComponent(inspecao.os)}'`);
            const cabecalhoId = busca?.value?.[0]?.cr4a1_peritagem_cabecalhoid;
            if (cabecalhoId) {
              cabecalho = { ...cabecalho, cr4a1_peritagem_cabecalhoid: cabecalhoId };
              await atualizarInspecaoOffline(inspecao.id, { cabecalho });
            }
          }

          // 2. Respostas do checklist — cada uma sai da fila local assim que
          // confirmada, pra uma retentativa só reenviar o que ainda falta.
          const respostasRestantes = { ...(inspecao.respostas || {}) };
          for (const [itemId, resposta] of Object.entries(respostasRestantes)) {
            const quantString = Object.entries(resposta.quantidades || {}).map(([op, qty]) => `${op}:${qty}`).join(';');
            await callDataverse('POST', '/cr4a1_peritagem_b04s', {
              cr4a1_os: inspecao.os,
              cr4a1_item: resposta.item_id,
              cr4a1_descricao: resposta.descricao,
              cr4a1_observacao: resposta.observacao,
              cr4a1_var_quant: quantString,
              cr4a1_tipo: resposta.tipo,
              cr4a1_peritador: resposta.peritador,
              cr4a1_referencia: JSON.stringify(resposta.referencia || {}),
            });
            delete respostasRestantes[itemId];
            await atualizarInspecaoOffline(inspecao.id, { respostas: respostasRestantes });
          }

          // 3. Fotos — mesma lógica de checkpoint.
          let fotosRestantes = [...(inspecao.fotos || [])];
          for (const foto of fotosRestantes) {
            const fotoRes = await fetch(`${import.meta.env.VITE_API_URL}/upload-foto`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ os: inspecao.os, fotoBase64: foto.base64, nomeArquivo: foto.nomeArquivo }),
            });
            if (!fotoRes.ok) throw new Error('Falha ao enviar foto');
            fotosRestantes = fotosRestantes.filter(f => f.id !== foto.id);
            await atualizarInspecaoOffline(inspecao.id, { fotos: fotosRestantes });
          }

          await removerInspecao(inspecao.id);
        } catch (err) {
          console.error('Erro ao sincronizar:', err);
          await marcarErro(inspecao.id, err.message);
          falharam++;
        }
      }

      toast.dismiss(toastId);
      if (falharam > 0) {
        toast.warning(`${falharam} inspeção(ões) não sincronizaram e serão tentadas de novo automaticamente.`);
      } else {
        toast.success('Sincronização concluída!');
      }
      await atualizarContagem();
    } finally {
      emAndamentoRef.current = false;
    }
  }, [token, isOnline, atualizarContagem, callDataverse]);

  useEffect(() => { atualizarContagem(); }, [atualizarContagem]);

  useEffect(() => {
    if (isOnline) { sincronizar(); }
  }, [isOnline]);

  return (
    <SyncContext.Provider value={{ pendentes, comErro, sincronizar, isOnline }}>
      {children}
    </SyncContext.Provider>
  );
}
