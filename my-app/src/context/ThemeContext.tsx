import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mode] = useState<ThemeMode>('dark');

  useEffect(() => {
    // Always set to dark mode
    applyTheme('dark');
  }, []);

  const setMode = (_newMode: ThemeMode) => {
    // No-op: theme is always dark
    applyTheme('dark');
  };

  const applyTheme = (themeMode: ThemeMode) => {
    const root = document.documentElement;
    root.setAttribute('data-theme', themeMode);
    // Set default color scheme (all use the same color now)
    root.setAttribute('data-color-scheme', 'green');
  };

  return (
    <ThemeContext.Provider value={{ mode, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
