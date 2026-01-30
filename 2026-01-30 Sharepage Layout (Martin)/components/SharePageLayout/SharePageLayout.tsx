'use client';

import React, { useCallback } from 'react';
import { Flex } from '@radix-ui/themes';
import { MainPanel } from '../MainPanel/MainPanel';
import { DevToolsPanel } from '../DevToolsPanel/DevToolsPanel';
import { ResizableDivider } from '../ResizableDivider/ResizableDivider';
import { useDevToolsState } from '@/hooks/useDevToolsState';
import { useDevToolsSync, DevToolsMessage } from '@/hooks/useDevToolsSync';
import styles from './SharePageLayout.module.css';

interface SharePageLayoutProps {
  children?: React.ReactNode;
  devToolsContent?: React.ReactNode;
}

export function SharePageLayout({ children, devToolsContent }: SharePageLayoutProps) {
  const {
    isOpen,
    layoutRatio,
    customRatio,
    isUndocked,
    isDragging,
    effectiveRatio,
    openDevTools,
    closeDevTools,
    cycleLayout,
    setLayoutRatio,
    setCustomRatio,
    setIsDragging,
    undockRight,
    undockBottom,
    dock,
    focusDevTools,
  } = useDevToolsState();

  // Handle messages from undocked window
  const handleMessage = useCallback(
    (message: DevToolsMessage) => {
      if (message.type === 'dock') {
        dock();
      }
    },
    [dock]
  );

  // Set up broadcast channel listener
  useDevToolsSync(handleMessage);

  const showDevToolsInline = isOpen && !isUndocked;
  const showDevToolsToggle = !isOpen || isUndocked;

  // Full width mode - single panel
  if (!showDevToolsInline) {
    return (
      <div className={styles.container}>
        <Flex height="100%" width="100%" className={styles.layout}>
          <div className={styles.mainPanelWrapper} style={{ flex: 1 }}>
            <MainPanel
              showDevToolsToggle={showDevToolsToggle}
              isUndocked={isUndocked}
              onOpenDevTools={openDevTools}
              onFocusDevTools={focusDevTools}
              isFullWidth={true}
            >
              {children}
            </MainPanel>
          </div>
        </Flex>
      </div>
    );
  }

  // Split mode - both panels wrapped together
  return (
    <div className={styles.container}>
      <Flex
        height="100%"
        width="100%"
        className={`${styles.layout} ${isDragging ? styles.dragging : ''}`}
        style={{ '--main-ratio': `${effectiveRatio}%` } as React.CSSProperties}
      >
        <Flex flexGrow="1" height="100%" className={styles.panelsWrapper}>
          <div className={styles.mainPanelWrapper}>
            <MainPanel
              showDevToolsToggle={false}
              onOpenDevTools={openDevTools}
              isFullWidth={false}
            >
              {children}
            </MainPanel>
          </div>

          <ResizableDivider
            onResize={setCustomRatio}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={() => setIsDragging(false)}
          />

          <div className={styles.devToolsPanelWrapper}>
            <DevToolsPanel
              currentLayout={layoutRatio}
              customRatio={customRatio}
              onCycleLayout={cycleLayout}
              onSelectLayout={setLayoutRatio}
              onUndockRight={undockRight}
              onUndockBottom={undockBottom}
              onClose={closeDevTools}
            >
              {devToolsContent}
            </DevToolsPanel>
          </div>
        </Flex>
      </Flex>
    </div>
  );
}
