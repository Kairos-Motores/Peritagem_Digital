import { createContext, useContext, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

const InspecaoContext = createContext();

export function InspecaoProvider({ children }) {
  const [inspecaoAtual, setInspecaoAtual] = useState(null);

  // Inicia uma nova inspeção a partir de uma OS
  const novaInspecao = (os) => {
    setInspecaoAtual({
      id: uuidv4(),
      os,
      cabecalhoId: null,
      inicio: new Date().toISOString(),
      itens: [],
      assinatura: null,
      fotos: [],
      filial: '',
      cliente: '',
      peritador: '',          // ← NOVO CAMPO
    });
  };

  // Retoma uma inspeção existente (OS já tem cabeçalho)
  const retomarInspecao = (os, cabecalhoId, filial = '', cliente = '', peritador = '') => {
    setInspecaoAtual({
      id: uuidv4(),
      os,
      cabecalhoId,
      inicio: new Date().toISOString(),
      itens: [],
      assinatura: null,
      fotos: [],
      filial,
      cliente,
      peritador,             // ← NOVO CAMPO
    });
  };

  const setCabecalhoId = (id) => {
    setInspecaoAtual(prev => prev ? { ...prev, cabecalhoId: id } : null);
  };

  // NOVA FUNÇÃO – guarda o nome do peritador no contexto
  const setPeritador = (nome) => {
    setInspecaoAtual(prev => prev ? { ...prev, peritador: nome } : null);
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
      retomarInspecao,
      setCabecalhoId,
      setPeritador,            // ← exporta a nova função
      adicionarItem,
      adicionarFoto,
      definirAssinatura,
    }}>
      {children}
    </InspecaoContext.Provider>
  );
}

export const useInspecao = () => useContext(InspecaoContext);