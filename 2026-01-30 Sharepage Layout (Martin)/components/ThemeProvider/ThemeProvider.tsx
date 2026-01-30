'use client';

import React, { createContext, useContext, useEffect, useCallback, useRef } from 'react';
import { Theme } from '@radix-ui/themes';
import { useTheme, ThemeMode, ResolvedTheme } from '@/hooks/useTheme';
import { useDevToolsSync, DevToolsMessage } from '@/hooks/useDevToolsSync';

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const themeState = useTheme();
  const isInitialMount = useRef(true);

  // Handle incoming theme change messages from other windows
  const handleMessage = useCallback(
    (message: DevToolsMessage) => {
      if (message.type === 'theme-change' && message.payload) {
        themeState.setTheme(message.payload as ThemeMode);
      }
    },
    [themeState]
  );

  const { sendThemeChange } = useDevToolsSync(handleMessage);

  // Broadcast theme changes to other windows (skip initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    sendThemeChange(themeState.mode);
  }, [themeState.mode, sendThemeChange]);

  return (
    <ThemeContext.Provider value={themeState}>
      <Theme
        accentColor="teal"
        grayColor="gray"
        radius="large"
        scaling="100%"
        appearance={themeState.resolvedTheme}
      >
        {children}
      </Theme>
    </ThemeContext.Provider>
  );
}
