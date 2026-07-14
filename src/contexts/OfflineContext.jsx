import { createContext, useContext, useState, useCallback } from 'react';
import { db } from '../db/fila';

const OfflineContext = createContext();

export function OfflineProvider({ children }) {
  const [modoOffline, setModoOffline] = useState(!navigator.onLine);

  window.addEventListener('online', () => setModoOffline(false));
  window.addEventListener('offline', () => setModoOffline(true));

  const salvarLocal = useCallback(async (dadosInspecao) => {
    await db.inspecoes.put({
      ...dadosInspecao,
      status: dadosInspecao.status || 'pendente',
      created_at: new Date().toISOString(),
    });
  }, []);

  const atualizarLocal = useCallback(async (id, novosDados) => {
    await db.inspecoes.update(id, novosDados);
  }, []);

  const removerLocal = useCallback(async (id) => {
    await db.inspecoes.delete(id);
  }, []);

  const listarPendentes = useCallback(async () => {
    return await db.inspecoes.where('status').equals('pendente').toArray();
  }, []);

  return (
    <OfflineContext.Provider value={{
      modoOffline,
      salvarLocal,
      atualizarLocal,
      removerLocal,
      listarPendentes,
    }}>
      {children}
    </OfflineContext.Provider>
  );
}

export const useOffline = () => useContext(OfflineContext);