'use client';

import React from 'react';
import { Tooltip } from '@radix-ui/themes';
import { IconButton } from '@/components/ui';
import { SunIcon, MoonIcon } from '@/components/icons';
import { useThemeContext } from '@/components/ThemeProvider/ThemeProvider';

export function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useThemeContext();

  return (
    <Tooltip
      content={resolvedTheme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      <IconButton
        variant="ghost"
        size="1"
        color="gray"
        onClick={toggleTheme}
        aria-label={`Switch to ${resolvedTheme === 'light' ? 'dark' : 'light'} mode`}
      >
        {resolvedTheme === 'light' ? <MoonIcon /> : <SunIcon />}
      </IconButton>
    </Tooltip>
  );
}
