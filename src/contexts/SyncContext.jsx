import { createContext, useState, useEffect, useCallback } from 'react';
import { db } from '../db/fila';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useDataverse } from '../hooks/useDataverse';
import { toast } from 'react-toastify';

export const SyncContext = createContext();

export function SyncProvider({ children }) {
  const [pendentes, setPendentes] = useState(0);
  const isOnline = useNetworkStatus();
  const { sendInspecao } = useDataverse();

  const atualizarContagem = useCallback(async () => {
    const count = await db.fila.where('status').equals('pendente').count();
    setPendentes(count);
  }, []);

  const sincronizar = useCallback(async () => {
    const itens = await db.fila.where('status').equals('pendente').toArray();
    if (itens.length === 0) return;

    // Notificação de início (persistente)
    const toastId = toast.loading(`Enviando ${itens.length} inspeção(ões)...`, {
      autoClose: false,
      closeOnClick: false,
      closeButton: false,
    });

    let sucesso = 0;
    let falha = 0;

    for (const item of itens) {
      try {
        await sendInspecao(JSON.parse(item.dados));
        await db.fila.delete(item.id);
        sucesso++;
      } catch {
        await db.fila.update(item.id, { status: 'erro' });
        falha++;
      }
    }

    // Remove o toast de carregamento
    toast.dismiss(toastId);

    // Notificação de resultado
    if (falha === 0) {
      toast.success(`Todas as ${sucesso} inspeções foram enviadas!`);
    } else if (sucesso > 0) {
      toast.warning(`${sucesso} enviadas, ${falha} com erro.`);
    } else {
      toast.error('Nenhuma inspeção pôde ser enviada.');
    }

    await atualizarContagem();
  }, [sendInspecao, atualizarContagem]);

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