'use client';

import { useLayoutEffect, useEffect } from 'react';
import { useThemeStore, type Theme } from '@/store/themeStore';

const THEME_COLORS: Record<Theme, string> = {
  dark: '#080b18',
  light: '#f4f6fb',
};

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  try {
    const raw = localStorage.getItem('bc-theme');
    const parsed = raw && JSON.parse(raw);
    return parsed?.state?.theme === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.style.colorScheme = theme;

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLORS[theme]);
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((s) => s.theme);

  useLayoutEffect(() => {
    const stored = readStoredTheme();
    if (stored !== useThemeStore.getState().theme) {
      useThemeStore.setState({ theme: stored });
    }
    applyTheme(stored);
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    return useThemeStore.persist.onFinishHydration(() => {
      applyTheme(useThemeStore.getState().theme);
    });
  }, []);

  return <>{children}</>;
}
