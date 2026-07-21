import { useState, useEffect, useCallback } from 'react';
import { db } from '../db/fila';
import { useDataverse } from './useDataverse';
import { useNetworkStatus } from './useNetworkStatus';

export function useModeloOffline() {
  const [itensModelo, setItensModelo] = useState([]);
  const [loading, setLoading] = useState(true);
  const isOnline = useNetworkStatus();
  const { getModeloItens } = useDataverse();

  const carregarCache = useCallback(async () => {
    return await db.modelo.toArray();
  }, []);

  const atualizarCache = useCallback(async (itens) => {
    await db.modelo.clear();
    await db.modelo.bulkPut(itens);
  }, []);

  useEffect(() => {
    const fetchModelo = async () => {
      setLoading(true);
      try {
        if (isOnline) {
          const itens = await getModeloItens();
          if (itens && itens.length > 0) {
            await atualizarCache(itens);
            setItensModelo(itens);
          } else {
            const cache = await carregarCache();
            setItensModelo(cache);
          }
        } else {
          const cache = await carregarCache();
          setItensModelo(cache);
        }
      } catch (error) {
        console.error('Erro ao carregar modelo:', error);
        const cache = await carregarCache();
        setItensModelo(cache);
      } finally {
        setLoading(false);
      }
    };

    fetchModelo();
  }, [isOnline, getModeloItens, atualizarCache, carregarCache]);

  return { itensModelo, loading };
}