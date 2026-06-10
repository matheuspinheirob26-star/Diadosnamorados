import React, { createContext, useContext, useEffect, useState } from 'react';
import { useStorefront } from './StorefrontContext';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextData {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  isDark: boolean; // Resolved active theme boolean
}

const ThemeContext = createContext<ThemeContextData>({
  theme: 'dark',
  setTheme: () => {},
  isDark: true
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { config } = useStorefront();
  
  // Try to load from localStorage first. If not found, use storefront config default.
  // We'll default to 'dark' if nothing is set because dark is the brand's primary theme.
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('amr_theme') as ThemeMode;
    if (saved) return saved;
    return config.defaultTheme || 'dark'; 
  });

  const [isDark, setIsDark] = useState<boolean>(true);

  // Update localStorage and document class when theme changes
  useEffect(() => {
    const root = window.document.documentElement;
    
    // Determine active theme
    let activeThemeIsDark = true;
    
    if (theme === 'system') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      activeThemeIsDark = systemPrefersDark;
    } else {
      activeThemeIsDark = theme === 'dark';
    }

    setIsDark(activeThemeIsDark);

    if (activeThemeIsDark) {
      root.classList.remove('light-mode');
    } else {
      root.classList.add('light-mode');
    }

    localStorage.setItem('amr_theme', theme);
  }, [theme]);

  // Listen for OS preference changes if in system mode
  useEffect(() => {
    if (theme !== 'system') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDark(e.matches);
      const root = window.document.documentElement;
      if (e.matches) {
        root.classList.remove('light-mode');
      } else {
        root.classList.add('light-mode');
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
