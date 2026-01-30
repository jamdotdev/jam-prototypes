'use client';

import React from 'react';
import { Flex } from '@radix-ui/themes';
import { MainHeader } from '../MainHeader/MainHeader';
import styles from './MainPanel.module.css';

interface MainPanelProps {
  children?: React.ReactNode;
  showDevToolsToggle: boolean;
  isUndocked?: boolean;
  onOpenDevTools?: () => void;
  onFocusDevTools?: () => void;
  isFullWidth: boolean;
}

export function MainPanel({
  children,
  showDevToolsToggle,
  isUndocked = false,
  onOpenDevTools,
  onFocusDevTools,
  isFullWidth,
}: MainPanelProps) {
  return (
    <Flex
      direction="column"
      height="100%"
      className={`${styles.panel} ${isFullWidth ? styles.fullWidth : styles.splitLeft}`}
    >
      <MainHeader
        showDevToolsToggle={showDevToolsToggle}
        isUndocked={isUndocked}
        onOpenDevTools={onOpenDevTools}
        onFocusDevTools={onFocusDevTools}
      />
      <div className={styles.content}>
        {children}
      </div>
    </Flex>
  );
}
