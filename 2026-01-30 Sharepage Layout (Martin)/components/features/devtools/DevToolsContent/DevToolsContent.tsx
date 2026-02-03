'use client';

import { useState } from 'react';
import { Flex, Text } from '@radix-ui/themes';
import { DevToolsTabBar } from '../DevToolsTabBar';
import { DevToolsInfoTab, MetadataItem } from '../DevToolsInfoTab';
import styles from './DevToolsContent.module.css';

interface DevToolsContentProps {
  defaultTab?: string;
  onTabChange?: (tab: string) => void;
  metadata?: MetadataItem[];
  customProperties?: MetadataItem[];
  timestamp?: Date;
  timezone?: string;
  onTimezoneChange?: (timezone: string) => void;
}

export function DevToolsContent({
  defaultTab = 'info',
  onTabChange,
  metadata,
  customProperties,
  timestamp,
  timezone,
  onTimezoneChange,
}: DevToolsContentProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  return (
    <Flex direction="column" className={styles.content}>
      <DevToolsTabBar
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      <div className={styles.tabContent}>
        {activeTab === 'info' && (
          <DevToolsInfoTab
            metadata={metadata}
            customProperties={customProperties}
            timestamp={timestamp}
            timezone={timezone}
            onTimezoneChange={onTimezoneChange}
          />
        )}

        {activeTab === 'console' && (
          <Flex
            align="center"
            justify="center"
            className={styles.placeholder}
          >
            <Text size="2" color="gray">
              Console content coming soon
            </Text>
          </Flex>
        )}

        {activeTab === 'network' && (
          <Flex
            align="center"
            justify="center"
            className={styles.placeholder}
          >
            <Text size="2" color="gray">
              Network content coming soon
            </Text>
          </Flex>
        )}

        {activeTab === 'actions' && (
          <Flex
            align="center"
            justify="center"
            className={styles.placeholder}
          >
            <Text size="2" color="gray">
              Actions content coming soon
            </Text>
          </Flex>
        )}

        {activeTab === 'backend' && (
          <Flex
            align="center"
            justify="center"
            className={styles.placeholder}
          >
            <Text size="2" color="gray">
              Backend content coming soon
            </Text>
          </Flex>
        )}

        {activeTab === 'mcp' && (
          <Flex
            align="center"
            justify="center"
            className={styles.placeholder}
          >
            <Text size="2" color="gray">
              MCP content coming soon
            </Text>
          </Flex>
        )}
      </div>
    </Flex>
  );
}
