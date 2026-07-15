import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const DebugContext = createContext(null);

export function DebugProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState(null); // { title, payload }

  // Atualiza o conteúdo contextual da tela atual sem forçar a abertura do painel.
  const setDebugData = useCallback((title, payload) => {
    setData({ title, payload });
  }, []);

  // Atualiza o conteúdo e abre o painel — usado após ações explícitas (ex: compra).
  const showDebug = useCallback((title, payload) => {
    setData({ title, payload });
    setIsOpen(true);
  }, []);

  const toggle = useCallback(() => setIsOpen((open) => !open), []);
  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo(
    () => ({ isOpen, data, setDebugData, showDebug, toggle, close }),
    [isOpen, data, setDebugData, showDebug, toggle, close],
  );

  return <DebugContext.Provider value={value}>{children}</DebugContext.Provider>;
}

export function useDebug() {
  const ctx = useContext(DebugContext);
  if (!ctx) throw new Error('useDebug must be used within a DebugProvider');
  return ctx;
}
