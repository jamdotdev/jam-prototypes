'use client';

import React from 'react';
import { Flex } from '@radix-ui/themes';
import { DevToolsHeader } from '@/components/layout/DevToolsHeader/DevToolsHeader';
import type { LayoutRatio } from '@/stores/devToolsStore';
import styles from './DevToolsPanel.module.css';

interface DevToolsPanelProps {
  children?: React.ReactNode;
  currentLayout: LayoutRatio;
  customRatio: number | null;
  onCycleLayout: () => void;
  onSelectLayout: (ratio: LayoutRatio) => void;
  onUndockRight: () => void;
  onUndockBottom: () => void;
  onClose: () => void;
}

export function DevToolsPanel({
  children,
  currentLayout,
  customRatio,
  onCycleLayout,
  onSelectLayout,
  onUndockRight,
  onUndockBottom,
  onClose,
}: DevToolsPanelProps) {
  return (
    <Flex direction="column" height="100%" className={styles.panel}>
      <DevToolsHeader
        currentLayout={currentLayout}
        customRatio={customRatio}
        onCycleLayout={onCycleLayout}
        onSelectLayout={onSelectLayout}
        onUndockRight={onUndockRight}
        onUndockBottom={onUndockBottom}
        onClose={onClose}
      />
      <div className={styles.content}>
        {children || (
          <Flex align="center" justify="center" height="100%" className={styles.placeholder}>
            <p>Dev tools content goes here</p>
          </Flex>
        )}
      </div>
    </Flex>
  );
}
