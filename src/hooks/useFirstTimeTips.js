import { useState, useEffect } from 'react';

const STORAGE_KEY = 'kairos_tips_v1';

export function useFirstTimeTips() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      setShow(true);
      // esconde automaticamente após 8 segundos
      const timer = setTimeout(() => {
        setShow(false);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, []);

  const markSeen = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setShow(false);
  };

  return { show, markSeen };
}