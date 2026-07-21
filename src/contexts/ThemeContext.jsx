import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // Tamanho da fonte (em px, valor base 16)
  const [fontSize, setFontSizeState] = useState(() => {
    const saved = localStorage.getItem('kairos_font_size');
    return saved ? Number(saved) : 16;
  });

  // Modo escuro
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('kairos_dark_mode');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      localStorage.setItem('kairos_dark_mode', String(next));
      return next;
    });
  }, []);

  const setFontSize = useCallback((size) => {
    setFontSizeState(size);
    localStorage.setItem('kairos_font_size', size);
  }, []);

  // Aplica classe dark ao <html> e variável de tamanho
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`;
  }, [fontSize]);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, fontSize, setFontSize }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);