'use client';

import { useEffect } from 'react';
import { Flex, Tooltip } from '@radix-ui/themes';
import { Button, IconButton } from '@/components/ui';
import { useDevToolsSync } from '@/hooks/useDevToolsSync';
import { UndockIcon } from '@/components/icons/UndockIcon';
import { SunIcon } from '@/components/icons/SunIcon';
import { MoonIcon } from '@/components/icons/MoonIcon';
import { useThemeContext } from '@/components/providers/ThemeProvider/ThemeProvider';
import { DevToolsContent } from '@/components/features/devtools';
import styles from './page.module.css';

export default function DevToolsPage() {
  const { sendClose, sendDock } = useDevToolsSync();
  const { resolvedTheme, toggleTheme } = useThemeContext();

  // Notify main window when this window closes
  useEffect(() => {
    const handleBeforeUnload = () => {
      sendClose();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [sendClose]);

  const handleDock = () => {
    sendDock();
    window.close();
  };

  return (
    <Flex direction="column" height="100vh" className={styles.container}>
      <Flex asChild align="center" justify="between" className={styles.header}>
        <header>
          <h1 className={styles.title}>Developer tools</h1>
          <Flex align="center" gap="0">
            <Tooltip content={resolvedTheme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
              <IconButton
                variant="ghost"
                size="2"
                color="gray"
                onClick={toggleTheme}
              >
                {resolvedTheme === 'light' ? <MoonIcon /> : <SunIcon />}
              </IconButton>
            </Tooltip>

            <div className={styles.separator} />

            <Button
              variant="ghost"
              size="2"
              color="gray"
              onClick={handleDock}
              title="Dock to main window"
            >
              <UndockIcon size={16} className={styles.dockIcon} />
              Dock
            </Button>
          </Flex>
        </header>
      </Flex>
      <Flex direction="column" flexGrow="1" className={styles.content}>
        <DevToolsContent />
      </Flex>
    </Flex>
  );
}
