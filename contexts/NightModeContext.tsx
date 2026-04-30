import React, { createContext, useContext, useState, useCallback } from 'react';

interface NightModeContextValue {
  nightMode: boolean;
  toggleNightMode: () => void;
}

const NightModeContext = createContext<NightModeContextValue | undefined>(undefined);

export const NightModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [nightMode, setNightMode] = useState(false);
  const toggleNightMode = useCallback(() => setNightMode(prev => !prev), []);

  return (
    <NightModeContext.Provider value={{ nightMode, toggleNightMode }}>
      {children}
    </NightModeContext.Provider>
  );
};

export function useNightMode(): NightModeContextValue {
  const ctx = useContext(NightModeContext);
  if (!ctx) {
    throw new Error('useNightMode must be used inside NightModeProvider');
  }
  return ctx;
}
