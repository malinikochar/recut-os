'use client';

import * as React from 'react';

export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'recut-theme';
export const DEFAULT_THEME: Theme = 'light';

let currentTheme: Theme = DEFAULT_THEME;
const listeners = new Set<() => void>();

function readPreferredTheme(): Theme {
  if (typeof window === 'undefined') {
    return DEFAULT_THEME;
  }
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
  } catch {
    // Ignore storage privacy restrictions; fall back to DOM or default 'light'.
  }
  const attr = document.documentElement.dataset.theme;
  if (attr === 'dark' || attr === 'light') {
    return attr;
  }
  return DEFAULT_THEME;
}

function applyDomTheme(theme: Theme) {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = theme;
  }
}

export function setThemePreference(next: Theme) {
  currentTheme = next;
  applyDomTheme(next);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Ignore storage privacy errors.
    }
  }
  listeners.forEach((listener) => listener());
}

function subscribe(callback: () => void) {
  listeners.add(callback);

  // Sync after hydration so initial SSR and initial client render match ('light'),
  // then immediately apply any saved 'dark' preference without hydration mismatch.
  const actual = readPreferredTheme();
  applyDomTheme(actual);
  if (actual !== currentTheme) {
    currentTheme = actual;
    queueMicrotask(callback);
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) {
      const next: Theme = event.newValue === 'dark' ? 'dark' : DEFAULT_THEME;
      currentTheme = next;
      applyDomTheme(next);
      listeners.forEach((listener) => listener());
    }
  };

  window.addEventListener('storage', handleStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener('storage', handleStorage);
  };
}

function getSnapshot(): Theme {
  return currentTheme;
}

function getServerSnapshot(): Theme {
  return DEFAULT_THEME;
}

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme: setThemePreference,
      toggleTheme: () => {
        const live = readPreferredTheme();
        setThemePreference(live === 'dark' ? 'light' : 'dark');
      },
    }),
    [theme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
