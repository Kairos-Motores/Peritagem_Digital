import { createContext, useContext, useState, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import GuiaApp from '../components/ui/GuiaApp';

const GuiaContext = createContext(null);

// O guia abre sozinho no primeiro login de cada usuário. A marca é por
// usuário porque o tablet é compartilhado na oficina: quem entra pela
// primeira vez naquele aparelho vê o guia, mesmo que outro já tenha visto.
const chave = (username) => `kairos_guia_visto_v1:${username || 'anon'}`;

const jaViu = (username) => {
  if (!username) return true;
  try {
    return localStorage.getItem(chave(username)) === '1';
  } catch {
    return true; // navegador sem storage: não insiste em abrir
  }
};

export function GuiaProvider({ children }) {
  const { user } = useAuth();
  const [abertoManual, setAbertoManual] = useState(false);
  const [dispensado, setDispensado] = useState(false);

  const username = user?.username;
  const aberto = abertoManual || (!!username && !dispensado && !jaViu(username));

  const abrirGuia = useCallback(() => setAbertoManual(true), []);

  const fecharGuia = useCallback(() => {
    if (username) {
      try { localStorage.setItem(chave(username), '1'); } catch { /* sem storage */ }
    }
    setAbertoManual(false);
    setDispensado(true);
  }, [username]);

  return (
    <GuiaContext.Provider value={{ aberto, abrirGuia, fecharGuia }}>
      {children}
      {aberto && <GuiaApp onFechar={fecharGuia} />}
    </GuiaContext.Provider>
  );
}

// Fora do provider (ex.: tela de login) o guia simplesmente não existe
const SEM_GUIA = { aberto: false, abrirGuia: () => {}, fecharGuia: () => {} };

export const useGuia = () => useContext(GuiaContext) || SEM_GUIA;
