import { useState, useEffect, useRef } from 'react';
import { db } from '../db/fila';
import { useDataverse } from './useDataverse';
import { useNetworkStatus } from './useNetworkStatus';

// Lista de modelos de peritagem (online busca e atualiza o cache; offline usa o cache)
export function useModelosPeritagem() {
  const [modelos, setModelos] = useState([]);
  const [loading, setLoading] = useState(true);
  const isOnline = useNetworkStatus();
  const { getModelosPeritagem } = useDataverse();

  const buscarRef = useRef(getModelosPeritagem);
  useEffect(() => { buscarRef.current = getModelosPeritagem; }, [getModelosPeritagem]);

  useEffect(() => {
    let cancelado = false;

    const carregarCache = async () => {
      try {
        const cache = await db.modelos_peritagem.toArray();
        return cache.sort((a, b) => Number(a.cr4a1_id) - Number(b.cr4a1_id));
      } catch {
        return [];
      }
    };

    const carregar = async () => {
      setLoading(true);
      let lista;
      try {
        if (isOnline) {
          lista = await buscarRef.current();
          try {
            await db.modelos_peritagem.clear();
            await db.modelos_peritagem.bulkPut(lista);
          } catch (e) {
            console.error('Erro ao atualizar cache de modelos de peritagem:', e);
          }
        } else {
          lista = await carregarCache();
        }
      } catch (e) {
        console.error('Erro ao carregar modelos de peritagem:', e);
        lista = await carregarCache();
      }
      if (!cancelado) {
        setModelos(lista);
        setLoading(false);
      }
    };

    carregar();
    return () => { cancelado = true; };
  }, [isOnline]);

  return { modelos, loading };
}
