'use client';

import { useState } from 'react';
import { Theme, Popover, Tooltip } from '@radix-ui/themes';
import { useThemeStore } from '@/stores/themeStore';
import { JamLabButton } from './JamLabButton/JamLabButton';
import { JamLabPanel } from './JamLabPanel/JamLabPanel';
import styles from './JamLab.module.css';

export function JamLab() {
  const [isOpen, setIsOpen] = useState(false);
  const resolvedTheme = useThemeStore((s) => s.resolvedTheme);

  // Invert: light → dark, dark → light
  const invertedTheme = resolvedTheme === 'light' ? 'dark' : 'light';

  return (
    <div className={styles.jamLabContainer}>
      <Theme appearance={invertedTheme} hasBackground={false}>
        <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
          <Tooltip content="Jam Lab" side="left">
            <Popover.Trigger>
              <JamLabButton isOpen={isOpen} />
            </Popover.Trigger>
          </Tooltip>
          <Popover.Content
            side="top"
            align="end"
            sideOffset={12}
            className={styles.popoverContent}
          >
            <JamLabPanel />
          </Popover.Content>
        </Popover.Root>
      </Theme>
    </div>
  );
}
