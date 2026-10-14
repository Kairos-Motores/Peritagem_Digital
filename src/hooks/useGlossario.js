import { useState, useEffect, useRef } from 'react';
import { db } from '../db/fila';
import { useDataverse } from './useDataverse';
import { useNetworkStatus } from './useNetworkStatus';

// Glossário de termos BR -> PT (online busca e atualiza o cache; offline usa
// o cache). Devolve um Map pra consulta exata O(1) em rotuloLocalizado().
export function useGlossario() {
  const [glossario, setGlossario] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const isOnline = useNetworkStatus();
  const { getGlossarioTermos } = useDataverse();

  const buscarRef = useRef(getGlossarioTermos);
  useEffect(() => { buscarRef.current = getGlossarioTermos; }, [getGlossarioTermos]);

  useEffect(() => {
    let cancelado = false;

    const paraMapa = (linhas) => new Map(
      linhas.filter(l => l.cr4a1_termobr && l.cr4a1_termopt).map(l => [l.cr4a1_termobr, l.cr4a1_termopt])
    );

    const carregarCache = async () => {
      try {
        return paraMapa(await db.glossario_termos.toArray());
      } catch {
        return new Map();
      }
    };

    const carregar = async () => {
      setLoading(true);
      let mapa;
      try {
        if (isOnline) {
          const lista = await buscarRef.current();
          mapa = paraMapa(lista);
          try {
            await db.glossario_termos.clear();
            await db.glossario_termos.bulkPut(lista);
          } catch (e) {
            console.error('Erro ao atualizar cache do glossário:', e);
          }
        } else {
          mapa = await carregarCache();
        }
      } catch (e) {
        console.error('Erro ao carregar glossário:', e);
        mapa = await carregarCache();
      }
      if (!cancelado) {
        setGlossario(mapa);
        setLoading(false);
      }
    };

    carregar();
    return () => { cancelado = true; };
  }, [isOnline]);

  return { glossario, loading };
}
