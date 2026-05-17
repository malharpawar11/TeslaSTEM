import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'nativewind';

type Theme = 'light' | 'dark';
const STORAGE_KEY = 'tsp.theme';

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { setColorScheme } = useColorScheme();
  const [theme, setThemeState] = useState<Theme>('dark');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = (await AsyncStorage.getItem(STORAGE_KEY)) as Theme | null;
        const initial: Theme = stored === 'light' || stored === 'dark' ? stored : 'dark';
        setThemeState(initial);
        setColorScheme(initial);
      } finally {
        setReady(true);
      }
    })();
  }, [setColorScheme]);

  const setTheme = useCallback(
    (t: Theme) => {
      setThemeState(t);
      setColorScheme(t);
      AsyncStorage.setItem(STORAGE_KEY, t).catch(() => {});
    },
    [setColorScheme],
  );

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  if (!ready) {
    return <View className="flex-1 bg-dark-bg" />;
  }

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
