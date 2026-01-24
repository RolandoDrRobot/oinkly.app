import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { storage } from '../utils/storage';

export type ThemeMode = 'light' | 'dark';
export type ColorScheme = 'teal' | 'blue' | 'purple' | 'green';

interface ThemeContextType {
  mode: ThemeMode;
  colorScheme: ColorScheme;
  setMode: (mode: ThemeMode) => void;
  setColorScheme: (scheme: ColorScheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>('dark');
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>('teal');

  useEffect(() => {
    const savedMode = storage.getThemeMode();
    const savedScheme = storage.getColorScheme();
    if (savedMode) setModeState(savedMode);
    if (savedScheme) setColorSchemeState(savedScheme as ColorScheme);
    applyTheme(savedMode || 'dark', (savedScheme || 'teal') as ColorScheme);
  }, []);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    storage.setThemeMode(newMode);
    applyTheme(newMode, colorScheme);
  };

  const setColorScheme = (newScheme: ColorScheme) => {
    setColorSchemeState(newScheme);
    storage.setColorScheme(newScheme);
    applyTheme(mode, newScheme);
  };

  const applyTheme = (themeMode: ThemeMode, scheme: ColorScheme) => {
    const root = document.documentElement;
    root.setAttribute('data-theme', themeMode);
    root.setAttribute('data-color-scheme', scheme);
  };

  return (
    <ThemeContext.Provider value={{ mode, colorScheme, setMode, setColorScheme }}>
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
