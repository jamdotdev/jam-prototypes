'use client';

import React from 'react';
import { DropdownMenu, Flex, Tooltip } from '@radix-ui/themes';
import { Button, IconButton } from '@/components/ui';
import {
  ChevronDownIcon,
  CodeIcon,
  LargeContentIcon,
  EqualSplitIcon,
  LargeDevIcon,
  UndockRightIcon,
  UndockBottomIcon,
  SunIcon,
  MoonIcon,
} from '../icons';
import { useThemeContext } from '@/components/ThemeProvider/ThemeProvider';
import type { LayoutRatio } from '@/hooks/useDevToolsState';
import styles from './DevToolsHeader.module.css';

interface DevToolsHeaderProps {
  currentLayout: LayoutRatio;
  customRatio: number | null;
  onCycleLayout: () => void;
  onSelectLayout: (ratio: LayoutRatio) => void;
  onUndockRight: () => void;
  onUndockBottom: () => void;
  onClose: () => void;
}

// Helper to get the icon component for a layout
function getLayoutIcon(layout: LayoutRatio) {
  switch (layout) {
    case '60/40':
      return LargeContentIcon;
    case '50/50':
      return EqualSplitIcon;
    case '40/60':
      return LargeDevIcon;
  }
}

// Helper to get tooltip text for current layout
function getLayoutTooltip(layout: LayoutRatio): string {
  switch (layout) {
    case '60/40':
      return 'Large main panel';
    case '50/50':
      return 'Equal split';
    case '40/60':
      return 'Large dev tools';
  }
}

export function DevToolsHeader({
  currentLayout,
  customRatio,
  onCycleLayout,
  onSelectLayout,
  onUndockRight,
  onUndockBottom,
  onClose,
}: DevToolsHeaderProps) {
  const isCustom = customRatio !== null;
  const CurrentLayoutIcon = getLayoutIcon(currentLayout);
  const { resolvedTheme, setTheme } = useThemeContext();

  return (
    <header className={styles.header}>
      <Flex align="center" gap="1" flexGrow="1" className={styles.leading}>
        <span className={styles.title}>Devtools</span>
      </Flex>

      <Flex align="center" gap="0">
        <Tooltip content={getLayoutTooltip(currentLayout)}>
          <IconButton variant="ghost" size="2" color="gray" onClick={onCycleLayout}>
            <CurrentLayoutIcon />
          </IconButton>
        </Tooltip>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <IconButton variant="ghost" size="2" color="gray">
              <ChevronDownIcon size={18} />
            </IconButton>
          </DropdownMenu.Trigger>

          <DropdownMenu.Content color="gray" variant="soft">
            <DropdownMenu.Label>View Options</DropdownMenu.Label>
            <DropdownMenu.Item
              onClick={() => onSelectLayout('60/40')}
              className={!isCustom && currentLayout === '60/40' ? styles.menuItemSelected : undefined}
            >
              <Flex align="center" justify="between" width="100%" className={styles.menuItem}>
                <Flex align="center" gap="2">
                  <LargeContentIcon />
                  Large main panel
                </Flex>
                {!isCustom && currentLayout === '60/40' && (
                  <span className={styles.checkmark}>✓</span>
                )}
              </Flex>
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onClick={() => onSelectLayout('50/50')}
              className={!isCustom && currentLayout === '50/50' ? styles.menuItemSelected : undefined}
            >
              <Flex align="center" justify="between" width="100%" className={styles.menuItem}>
                <Flex align="center" gap="2">
                  <EqualSplitIcon />
                  Equal split
                </Flex>
                {!isCustom && currentLayout === '50/50' && (
                  <span className={styles.checkmark}>✓</span>
                )}
              </Flex>
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onClick={() => onSelectLayout('40/60')}
              className={!isCustom && currentLayout === '40/60' ? styles.menuItemSelected : undefined}
            >
              <Flex align="center" justify="between" width="100%" className={styles.menuItem}>
                <Flex align="center" gap="2">
                  <LargeDevIcon />
                  Large dev tools
                </Flex>
                {!isCustom && currentLayout === '40/60' && (
                  <span className={styles.checkmark}>✓</span>
                )}
              </Flex>
            </DropdownMenu.Item>
            <DropdownMenu.Separator />
            <DropdownMenu.Item onClick={onUndockRight}>
              <Flex align="center" gap="2">
                <UndockRightIcon />
                Undock right
              </Flex>
            </DropdownMenu.Item>
            <DropdownMenu.Item onClick={onUndockBottom}>
              <Flex align="center" gap="2">
                <UndockBottomIcon />
                Undock below
              </Flex>
            </DropdownMenu.Item>

            <DropdownMenu.Separator />
            <DropdownMenu.Label>Theme</DropdownMenu.Label>
            <DropdownMenu.Sub>
              <DropdownMenu.SubTrigger>
                <Flex align="center" gap="2">
                  {resolvedTheme === 'light' ? <SunIcon /> : <MoonIcon />}
                  {resolvedTheme === 'light' ? 'Light' : 'Dark'}
                </Flex>
              </DropdownMenu.SubTrigger>
              <DropdownMenu.SubContent>
                <DropdownMenu.Item onClick={() => setTheme('light')}>
                  <Flex align="center" justify="between" width="100%" className={styles.menuItem}>
                    <Flex align="center" gap="2">
                      <SunIcon />
                      Light
                    </Flex>
                    {resolvedTheme === 'light' && (
                      <span className={styles.checkmark}>✓</span>
                    )}
                  </Flex>
                </DropdownMenu.Item>
                <DropdownMenu.Item onClick={() => setTheme('dark')}>
                  <Flex align="center" justify="between" width="100%" className={styles.menuItem}>
                    <Flex align="center" gap="2">
                      <MoonIcon />
                      Dark
                    </Flex>
                    {resolvedTheme === 'dark' && (
                      <span className={styles.checkmark}>✓</span>
                    )}
                  </Flex>
                </DropdownMenu.Item>
              </DropdownMenu.SubContent>
            </DropdownMenu.Sub>
          </DropdownMenu.Content>
        </DropdownMenu.Root>

        <div className={styles.separator} />

        <Button variant="ghost" size="2" color="gray" onClick={onClose}>
          <CodeIcon />
          Hide Devtools
        </Button>
      </Flex>
    </header>
  );
}
