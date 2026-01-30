'use client';

import { useEffect } from 'react';
import { Flex, Tooltip } from '@radix-ui/themes';
import { Button, IconButton } from '@/components/ui';
import { useDevToolsSync } from '@/hooks/useDevToolsSync';
import { UndockIcon, SunIcon, MoonIcon } from '@/components/icons';
import { useThemeContext } from '@/components/ThemeProvider/ThemeProvider';
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
          <h1 className={styles.title}>Devtools</h1>
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
      <Flex asChild align="center" justify="center" flexGrow="1" className={styles.content}>
        <main>
          <p>Undocked dev tools content</p>
        </main>
      </Flex>
    </Flex>
  );
}
