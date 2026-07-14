import { createContext, useContext, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

const InspecaoContext = createContext();

export function InspecaoProvider({ children }) {
  const [inspecaoAtual, setInspecaoAtual] = useState(null);

  // Inicia uma nova inspeção a partir de uma OS
  const novaInspecao = (os) => {
    setInspecaoAtual({
      id: uuidv4(),
      os,                          // OS da inspeção
      cabecalhoId: null,          // será preenchido após salvar cabeçalho
      inicio: new Date().toISOString(),
      itens: [],
      assinatura: null,
      fotos: [],
    });
  };

  // Retoma uma inspeção existente (OS já tem cabeçalho)
  const retomarInspecao = (os, cabecalhoId, filial = '', cliente = '') => {
    setInspecaoAtual({
      id: uuidv4(),
      os,
      cabecalhoId,
      inicio: new Date().toISOString(),
      itens: [],
      assinatura: null,
      fotos: [],
      filial,      // preenche com os dados recebidos
      cliente,     // preenche com os dados recebidos
    });
  };

  const setCabecalhoId = (id) => {
    setInspecaoAtual(prev => prev ? { ...prev, cabecalhoId: id } : null);
  };

  const adicionarItem = (item) => {
    setInspecaoAtual(prev => prev ? { ...prev, itens: [...prev.itens, { ...item, id: uuidv4() }] } : null);
  };

  const adicionarFoto = (foto) => {
    setInspecaoAtual(prev => prev ? { ...prev, fotos: [...prev.fotos, foto] } : null);
  };

  const definirAssinatura = (base64) => {
    setInspecaoAtual(prev => prev ? { ...prev, assinatura: base64 } : null);
  };

  return (
    <InspecaoContext.Provider value={{
      inspecaoAtual,
      novaInspecao,
      retomarInspecao,   // ← nova função
      setCabecalhoId,
      adicionarItem,
      adicionarFoto,
      definirAssinatura,
    }}>
      {children}
    </InspecaoContext.Provider>
  );
}

export const useInspecao = () => useContext(InspecaoContext);