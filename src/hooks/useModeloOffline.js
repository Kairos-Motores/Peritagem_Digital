import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../db/fila';
import { useDataverse } from './useDataverse';
import { useNetworkStatus } from './useNetworkStatus';

export function useModeloOffline() {
  const [itensModelo, setItensModelo] = useState([]);
  const [loading, setLoading] = useState(true);
  const isOnline = useNetworkStatus();
  const { getModeloItens } = useDataverse();

  // Guarda a função getModeloItens numa ref para não mudar a cada render
  const getModeloItensRef = useRef(getModeloItens);
  useEffect(() => {
    getModeloItensRef.current = getModeloItens;
  }, [getModeloItens]);

  const carregarCache = useCallback(async () => {
    try {
      return await db.modelo.toArray();
    } catch (e) {
      // Se a tabela não existir, devolve array vazio
      return [];
    }
  }, []);

  const atualizarCache = useCallback(async (itens) => {
    try {
      await db.modelo.clear();
      await db.modelo.bulkPut(itens);
    } catch (e) {
      console.error('Erro ao atualizar cache do modelo:', e);
    }
  }, []);

  useEffect(() => {
    let cancelado = false;

    const fetchModelo = async () => {
      setLoading(true);
      try {
        if (isOnline) {
          const itens = await getModeloItensRef.current();
          if (itens && itens.length > 0) {
            await atualizarCache(itens);
            if (!cancelado) setItensModelo(itens);
          } else {
            const cache = await carregarCache();
            if (!cancelado) setItensModelo(cache);
          }
        } else {
          const cache = await carregarCache();
          if (!cancelado) setItensModelo(cache);
        }
      } catch (error) {
        console.error('Erro ao carregar modelo:', error);
        const cache = await carregarCache();
        if (!cancelado) setItensModelo(cache);
      } finally {
        if (!cancelado) setLoading(false);
      }
    };

    fetchModelo();

    return () => {
      cancelado = true;
    };
  }, [isOnline, carregarCache, atualizarCache]);

  return { itensModelo, loading };
}