'use client';

import React, { useCallback } from 'react';
import { Flex } from '@radix-ui/themes';
import { MainPanel } from '@/components/layout/MainPanel/MainPanel';
import { DevToolsPanel } from '@/components/layout/DevToolsPanel/DevToolsPanel';
import { ResizableDivider } from '@/components/ui/ResizableDivider/ResizableDivider';
import { useDevToolsStore } from '@/stores/devToolsStore';
import { useDevToolsWindow } from '@/hooks/useDevToolsWindow';
import { useDevToolsSync, DevToolsMessage } from '@/hooks/useDevToolsSync';
import styles from './SharePageLayout.module.css';

interface SharePageLayoutProps {
  children?: React.ReactNode;
  devToolsContent?: React.ReactNode;
}

export function SharePageLayout({ children, devToolsContent }: SharePageLayoutProps) {
  // Get state from store
  const isOpen = useDevToolsStore((s) => s.isOpen);
  const layoutRatio = useDevToolsStore((s) => s.layoutRatio);
  const customRatio = useDevToolsStore((s) => s.customRatio);
  const isUndocked = useDevToolsStore((s) => s.isUndocked);
  const isDragging = useDevToolsStore((s) => s.isDragging);
  const effectiveRatio = useDevToolsStore((s) => s.effectiveRatio());
  const open = useDevToolsStore((s) => s.open);
  const close = useDevToolsStore((s) => s.close);
  const cycleLayout = useDevToolsStore((s) => s.cycleLayout);
  const setLayoutRatio = useDevToolsStore((s) => s.setLayoutRatio);
  const setCustomRatio = useDevToolsStore((s) => s.setCustomRatio);
  const setIsDragging = useDevToolsStore((s) => s.setIsDragging);
  const dock = useDevToolsStore((s) => s.dock);

  // Window management from hook
  const { undockRight, undockBottom, focusWindow } = useDevToolsWindow();

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
              onOpenDevTools={open}
              onFocusDevTools={focusWindow}
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
              onOpenDevTools={open}
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
              onClose={close}
            >
              {devToolsContent}
            </DevToolsPanel>
          </div>
        </Flex>
      </Flex>
    </div>
  );
}
