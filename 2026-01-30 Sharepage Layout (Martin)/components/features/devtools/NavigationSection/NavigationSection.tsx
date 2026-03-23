'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Box, Flex, Text, SegmentedControl } from '@radix-ui/themes';
import { IconButton } from '@/components/ui';
import { ChevronDownIcon } from '@/components/icons/ChevronDownIcon';
import type { NavigationData, NavigationEvent } from '@/types/navigation.types';
import { NavigationEventRow } from '../NavigationEventRow';
import styles from './NavigationSection.module.css';

interface NavigationSectionProps {
  navigationData: NavigationData;
  activeEvent: NavigationEvent;
  onEventClick?: (event: NavigationEvent) => void;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function NavigationSection({
  navigationData,
  activeEvent,
  onEventClick,
}: NavigationSectionProps) {
  const { tabs } = navigationData;
  const hasMultipleTabs = tabs.length > 1;

  // Determine total URL count across all tabs
  const totalUrlCount = useMemo(
    () => tabs.reduce((sum, tab) => sum + tab.events.length, 0),
    [tabs]
  );
  const isSingleUrl = totalUrlCount === 1;
  const hasMultipleUrls = totalUrlCount > 1;

  // Expand/collapse state
  const [isExpanded, setIsExpanded] = useState(false);

  // Track which tab is being viewed manually (null = follow active event)
  const [viewedTabId, setViewedTabId] = useState<string | null>(null);
  const prevActiveTabIdRef = useRef(activeEvent.tabId);

  // When the active event switches tabs, reset manual tab selection to follow
  useEffect(() => {
    if (activeEvent.tabId !== prevActiveTabIdRef.current) {
      setViewedTabId(null);
      prevActiveTabIdRef.current = activeEvent.tabId;
    }
  }, [activeEvent.tabId]);

  // Reset viewedTabId if the tab no longer exists (e.g. tabCount reduced)
  useEffect(() => {
    if (viewedTabId && !tabs.find((t) => t.id === viewedTabId)) {
      setViewedTabId(null);
    }
  }, [tabs, viewedTabId]);

  // Reset expand state when navigation data changes (settings changed)
  const prevNavDataRef = useRef(navigationData);
  useEffect(() => {
    if (navigationData !== prevNavDataRef.current) {
      setIsExpanded(false);
      prevNavDataRef.current = navigationData;
    }
  }, [navigationData]);

  const currentTabId = viewedTabId ?? activeEvent.tabId;
  const currentTab = tabs.find((t) => t.id === currentTabId) ?? tabs[0];

  const handleTabChange = (value: string) => {
    setViewedTabId(value);
  };

  const toggleExpanded = () => {
    setIsExpanded((prev) => !prev);
  };

  // Determine which events to render
  const eventsToRender = isExpanded
    ? currentTab.events
    : [activeEvent];

  return (
    <Flex direction="column" gap="1">
      {/* Header — hidden when 1 tab, 1 URL (nothing to control) */}
      {(hasMultipleTabs || hasMultipleUrls) && (
        <Flex align="center" px="2" py="1">
          <Text size="1" weight="medium" color="gray">
            Visited URLs
          </Text>
          <Box flexGrow="1" className={styles.tabsCenter}>
            {hasMultipleTabs && (
              <SegmentedControl.Root
                value={currentTabId}
                onValueChange={handleTabChange}
                size="1"
              >
                {tabs.map((tab) => (
                  <SegmentedControl.Item key={tab.id} value={tab.id}>
                    {tab.label}
                  </SegmentedControl.Item>
                ))}
              </SegmentedControl.Root>
            )}
          </Box>
          {hasMultipleUrls && (
            <IconButton
              variant="ghost"
              size="1"
              color="gray"
              onClick={toggleExpanded}
            >
              <ChevronDownIcon
                size={14}
                className={isExpanded ? styles.chevronExpanded : undefined}
              />
            </IconButton>
          )}
        </Flex>
      )}

      {/* URL list */}
      <Flex direction="column">
        {eventsToRender.map((event) => (
          <NavigationEventRow
            key={event.id}
            event={event}
            isSelected={event.id === activeEvent.id}
            showIndicator={!isSingleUrl}
            timestampLabel={isSingleUrl ? 'URL' : formatTime(event.timestamp)}
            onClick={() => onEventClick?.(event)}
          />
        ))}
      </Flex>
    </Flex>
  );
}
