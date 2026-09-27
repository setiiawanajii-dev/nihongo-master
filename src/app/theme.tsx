import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Theme = 'light' | 'dark';
const ThemeContext = createContext<{
  theme: Theme; setTheme: (theme: Theme) => void; storageAvailable: boolean;
} | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  const [storageAvailable, setStorageAvailable] = useState(true);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#152922' : '#275749');
    try { localStorage.setItem('nihongo-master:theme', theme); setStorageAvailable(true); }
    catch { setStorageAvailable(false); }
  }, [theme]);
  return <ThemeContext.Provider value={{ theme, setTheme, storageAvailable }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('ThemeProvider is required');
  return context;
}
