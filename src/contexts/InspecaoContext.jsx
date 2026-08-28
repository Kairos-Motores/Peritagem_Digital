import { createContext, useContext, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

const InspecaoContext = createContext();

export const MAX_PERITAGENS_ABERTAS = 3;

function criarEntrada({ os, cabecalhoId = null, filial = '', cliente = '', peritador = '' }) {
  return {
    id: uuidv4(),
    os,
    cabecalhoId,
    inicio: new Date().toISOString(),
    itens: [],
    assinatura: null,
    fotos: [],
    filial,
    cliente,
    peritador,
  };
}

export function InspecaoProvider({ children }) {
  // Várias peritagens podem ficar abertas ao mesmo tempo; osAtivo diz qual
  // delas está em foco. inspecaoAtual é derivado — mantém a mesma forma de
  // antes pra quem consome o contexto não precisar mudar nada.
  const [inspecoesAbertas, setInspecoesAbertas] = useState([]);
  const [osAtivo, setOsAtivo] = useState(null);

  const inspecaoAtual = inspecoesAbertas.find(i => i.os === osAtivo) ?? null;

  const podeAbrirNova = (os) => {
    return inspecoesAbertas.some(i => i.os === os) || inspecoesAbertas.length < MAX_PERITAGENS_ABERTAS;
  };

  // Abre uma peritagem nova ou só foca se ela já estiver aberta.
  // Retorna false se o limite de abas foi atingido, pra quem chamou avisar o usuário.
  const abrirPeritagem = (dados) => {
    const jaAberta = inspecoesAbertas.some(i => i.os === dados.os);
    if (!jaAberta && inspecoesAbertas.length >= MAX_PERITAGENS_ABERTAS) return false;
    if (!jaAberta) setInspecoesAbertas(prev => [...prev, criarEntrada(dados)]);
    setOsAtivo(dados.os);
    return true;
  };

  // Inicia uma nova inspeção a partir de uma OS
  const novaInspecao = (os) => abrirPeritagem({ os });

  // Retoma uma inspeção existente (OS já tem cabeçalho)
  const retomarInspecao = (os, cabecalhoId, filial = '', cliente = '', peritador = '') =>
    abrirPeritagem({ os, cabecalhoId, filial, cliente, peritador });

  const focarAba = (os) => {
    if (inspecoesAbertas.some(i => i.os === os)) setOsAtivo(os);
  };

  const fecharAba = (os) => {
    const restantes = inspecoesAbertas.filter(i => i.os !== os);
    setInspecoesAbertas(restantes);
    if (osAtivo === os) {
      setOsAtivo(restantes.length > 0 ? restantes[restantes.length - 1].os : null);
    }
  };

  const atualizarAtiva = (updater) => {
    setInspecoesAbertas(prev => prev.map(i => (i.os === osAtivo ? updater(i) : i)));
  };

  const setCabecalhoId = (id) => atualizarAtiva(i => ({ ...i, cabecalhoId: id }));

  // guarda o nome do peritador no contexto
  const setPeritador = (nome) => atualizarAtiva(i => ({ ...i, peritador: nome }));

  const adicionarItem = (item) => atualizarAtiva(i => ({ ...i, itens: [...i.itens, { ...item, id: uuidv4() }] }));

  const adicionarFoto = (foto) => atualizarAtiva(i => ({ ...i, fotos: [...i.fotos, foto] }));

  const definirAssinatura = (base64) => atualizarAtiva(i => ({ ...i, assinatura: base64 }));

  return (
    <InspecaoContext.Provider value={{
      inspecaoAtual,
      inspecoesAbertas,
      osAtivo,
      novaInspecao,
      retomarInspecao,
      focarAba,
      fecharAba,
      podeAbrirNova,
      setCabecalhoId,
      setPeritador,
      adicionarItem,
      adicionarFoto,
      definirAssinatura,
    }}>
      {children}
    </InspecaoContext.Provider>
  );
}

export const useInspecao = () => useContext(InspecaoContext);
