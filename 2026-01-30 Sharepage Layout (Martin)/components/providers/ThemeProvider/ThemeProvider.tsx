'use client';

import React, { useEffect, useCallback, useRef } from 'react';
import { Theme } from '@radix-ui/themes';
import { useThemeStore, type ThemeMode } from '@/stores/themeStore';
import { useDevToolsSync, DevToolsMessage } from '@/hooks/useDevToolsSync';

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

// Export hook for components to use (wraps Zustand store)
export function useThemeContext(): ThemeContextValue {
  const mode = useThemeStore((s) => s.mode);
  const resolvedTheme = useThemeStore((s) => s.resolvedTheme);
  const toggle = useThemeStore((s) => s.toggle);
  const setMode = useThemeStore((s) => s.setMode);

  return {
    mode,
    resolvedTheme,
    toggleTheme: toggle,
    setTheme: setMode,
  };
}

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const mode = useThemeStore((s) => s.mode);
  const resolvedTheme = useThemeStore((s) => s.resolvedTheme);
  const setMode = useThemeStore((s) => s.setMode);
  const isInitialMount = useRef(true);

  // Handle incoming theme change messages from other windows
  const handleMessage = useCallback(
    (message: DevToolsMessage) => {
      if (message.type === 'theme-change' && message.payload) {
        setMode(message.payload as ThemeMode);
      }
    },
    [setMode]
  );

  const { sendThemeChange } = useDevToolsSync(handleMessage);

  // Broadcast theme changes to other windows (skip initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    sendThemeChange(mode);
  }, [mode, sendThemeChange]);

  return (
    <Theme
      accentColor="teal"
      grayColor="gray"
      radius="large"
      scaling="100%"
      appearance={resolvedTheme}
    >
      {children}
    </Theme>
  );
}
