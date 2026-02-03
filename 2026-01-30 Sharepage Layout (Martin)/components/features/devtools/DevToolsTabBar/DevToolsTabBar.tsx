'use client';

import { Tabs, Flex, IconButton } from '@radix-ui/themes';
import { CopyIcon } from '@/components/icons/CopyIcon';
import styles from './DevToolsTabBar.module.css';

interface Tab {
  id: string;
  label: string;
}

interface DevToolsTabBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs?: Tab[];
  onCopyClick?: () => void;
}

const DEFAULT_TABS: Tab[] = [
  { id: 'info', label: 'Info' },
  { id: 'console', label: 'Console' },
  { id: 'network', label: 'Network' },
  { id: 'actions', label: 'Actions' },
  { id: 'backend', label: 'Backend' },
  { id: 'mcp', label: 'MCP' },
];

export function DevToolsTabBar({
  activeTab,
  onTabChange,
  tabs = DEFAULT_TABS,
  onCopyClick,
}: DevToolsTabBarProps) {
  return (
    <div className={styles.tabBarWrapper}>
      <Tabs.Root value={activeTab} onValueChange={onTabChange}>
        <Flex align="center" justify="between" className={styles.tabBar}>
          <Tabs.List className={styles.tabsList}>
            {tabs.map((tab) => (
              <Tabs.Trigger
                key={tab.id}
                value={tab.id}
                className={styles.tabTrigger}
              >
                {tab.label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          <Flex align="center" px="2" className={styles.trailing}>
            <IconButton
              variant="ghost"
              size="1"
              color="gray"
              onClick={onCopyClick}
            >
              <CopyIcon />
            </IconButton>
          </Flex>
        </Flex>
      </Tabs.Root>
    </div>
  );
}
