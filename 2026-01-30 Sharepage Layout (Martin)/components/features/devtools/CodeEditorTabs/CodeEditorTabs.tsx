'use client';

import { Flex, IconButton, Tooltip } from '@radix-ui/themes';
import { XCloseIcon } from '@/components/icons/XCloseIcon';
import styles from './CodeEditorTabs.module.css';

export interface OpenTab {
  name: string;
  value: any;
  parseError?: boolean;
}

interface CodeEditorTabsProps {
  tabs: OpenTab[];
  activeTabName: string | null;
  onTabChange: (name: string) => void;
  onTabClose: (name: string) => void;
}

export function CodeEditorTabs({
  tabs,
  activeTabName,
  onTabChange,
  onTabClose,
}: CodeEditorTabsProps) {
  if (tabs.length === 0) return null;

  return (
    <div className={styles.tabBar}>
      {tabs.map((tab) => (
        <button
          key={tab.name}
          className={`${styles.tab} ${tab.name === activeTabName ? styles.active : ''}`}
          onClick={() => onTabChange(tab.name)}
        >
          <span className={styles.tabLabel}>{tab.name}</span>
          <Tooltip content="Close">
            <IconButton
              variant="ghost"
              size="1"
              color="gray"
              className={styles.closeButton}
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.name);
              }}
            >
              <XCloseIcon size={12} />
            </IconButton>
          </Tooltip>
        </button>
      ))}
    </div>
  );
}
