'use client';

import { useState, useEffect, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'jam-theme';

// Helper to get initial theme from localStorage (runs synchronously)
function getInitialMode(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
  if (saved && ['light', 'dark', 'system'].includes(saved)) {
    return saved;
  }
  return 'system';
}

// Helper to resolve theme based on mode (runs synchronously)
function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return mode;
}

export function useTheme() {
  // Initialize from localStorage synchronously to avoid flash
  const [mode, setMode] = useState<ThemeMode>(getInitialMode);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(getInitialMode()));

  // Resolve system preference and save to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);

    if (mode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
        setResolvedTheme(e.matches ? 'dark' : 'light');
      };
      handleChange(mediaQuery);
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      setResolvedTheme(mode);
    }
  }, [mode]);

  const toggleTheme = useCallback(() => {
    setMode((prev) => {
      // Toggle between light and dark (skip system for simple toggle)
      if (prev === 'light') return 'dark';
      return 'light';
    });
  }, []);

  const setTheme = useCallback((newMode: ThemeMode) => {
    setMode(newMode);
  }, []);

  return {
    mode,
    resolvedTheme,
    toggleTheme,
    setTheme,
  };
}
