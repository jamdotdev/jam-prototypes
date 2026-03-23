'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { ScrollArea } from '@radix-ui/themes';
import { MetadataSection } from '../MetadataSection';
import {
  PropertyItemSimple,
  PropertyItemWithIcon,
  PropertyItemTimestamp,
  PropertyItemCode,
} from '../PropertyItem';
import { CodeEditorPanel } from '../CodeEditorPanel';
import { OpenTab } from '../CodeEditorTabs';
import { JamMetaDataSection } from '../JamMetaDataSection';
import { CustomMetaDataSection } from '../CustomMetaDataSection';
import { NavigationSection } from '../NavigationSection';
import { IntercomMetaDataSection } from '../IntercomMetaDataSection';
import { AppleIcon } from '@/components/icons/AppleIcon';
import { ChromeIcon } from '@/components/icons/ChromeIcon';
import {
  generateDeviceMetadata,
  DEFAULT_CUSTOM_PROPERTIES,
  INTERCOM_METADATA,
  type MetadataItem,
} from '@/data/constants/devToolsDefaults';
import { useSettings } from '@/stores/settingsStore';
import { useVideoPlaybackStore } from '@/stores/videoPlaybackStore';
import { generateNavigationData } from '@/data/factories/navigationFactory';
import styles from './DevToolsInfoTab.module.css';

interface DevToolsInfoTabProps {
  customProperties?: MetadataItem[];
  timestamp?: Date;
  timezone?: string;
  onTimezoneChange?: (timezone: string) => void;
}

function getIcon(icon: MetadataItem['icon']): React.ReactNode {
  if (icon === 'apple') return <AppleIcon size={14} />;
  if (icon === 'chrome') return <ChromeIcon size={14} />;
  return icon;
}

const BREAKPOINT_WIDTH = 400;
const MIN_PANE_PERCENT = 20;
const MAX_PANE_PERCENT = 80;
const DEFAULT_SPLIT = 50;

export function DevToolsInfoTab({
  customProperties = DEFAULT_CUSTOM_PROPERTIES,
  timestamp = new Date(),
  timezone,
  onTimezoneChange,
}: DevToolsInfoTabProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dividerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const [panelWidth, setPanelWidth] = useState(0);
  const [splitRatio, setSplitRatio] = useState(DEFAULT_SPLIT);
  const [isDragging, setIsDragging] = useState(false);
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeTabName, setActiveTabName] = useState<string | null>(null);

  // Settings & video playback
  const settings = useSettings();
  const currentTime = useVideoPlaybackStore((s) => s.currentTime);
  const setCurrentTime = useVideoPlaybackStore((s) => s.setCurrentTime);

  // Dynamic device metadata based on origin and jam type
  const deviceMetadata = useMemo(
    () => generateDeviceMetadata(settings.origin, settings.jamType),
    [settings.origin, settings.jamType]
  );

  // Generate navigation data for video jams (not iOS — no URL tracking on mobile)
  const navigationData = useMemo(
    () =>
      settings.jamType === 'video' && settings.origin !== 'ios'
        ? generateNavigationData(settings)
        : null,
    [settings.jamType, settings.origin, settings.tabCount, settings.urlChangesPerTab]
  );

  // Resolve active navigation event (auto-sync with video time)
  const activeEvent = useMemo(() => {
    if (!navigationData) return null;
    const candidate = navigationData.events
      .filter((e) => e.timestamp <= currentTime)
      .at(-1);
    return candidate ?? navigationData.events[0];
  }, [navigationData, currentTime]);

  // Determine which custom properties to display
  const displayedCustomProperties =
    activeEvent?.customProperties ?? customProperties;

  // Detect container width for responsive layout
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      setPanelWidth(width);
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const layout = panelWidth >= BREAKPOINT_WIDTH ? 'right' : 'bottom';
  const isStacked = layout === 'bottom';

  // Handle divider drag - works for both horizontal and vertical
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();

    let ratio: number;
    if (isStacked) {
      const mouseY = e.clientY - containerRect.top;
      ratio = (mouseY / containerRect.height) * 100;
    } else {
      const mouseX = e.clientX - containerRect.left;
      ratio = (mouseX / containerRect.width) * 100;
    }

    const constrainedRatio = Math.max(MIN_PANE_PERCENT, Math.min(MAX_PANE_PERCENT, ratio));
    setSplitRatio(constrainedRatio);
  }, [isStacked]);

  const handleMouseUp = useCallback(() => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setIsDragging(false);
    }
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    document.body.style.cursor = isStacked ? 'row-resize' : 'col-resize';
    document.body.style.userSelect = 'none';
    setIsDragging(true);
  }, [isStacked]);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleEventClick = useCallback((event: { timestamp: number }) => {
    setTimeout(() => setCurrentTime(event.timestamp), 0);
  }, [setCurrentTime]);

  const handleOpenProperty = useCallback((name: string, rawValue: string) => {
    setTimeout(() => {
      const existing = openTabs.find((tab) => tab.name === name);
      if (existing) {
        setActiveTabName(name);
        return;
      }

      let parsedValue: any;
      let parseError = false;

      try {
        parsedValue = JSON.parse(rawValue);
      } catch {
        parsedValue = rawValue;
        parseError = true;
      }

      setOpenTabs((prev) => [...prev, { name, value: parsedValue, parseError }]);
      setActiveTabName(name);
    }, 0);
  }, [openTabs]);

  const handleCloseTab = useCallback((name: string) => {
    setOpenTabs((prev) => {
      const newTabs = prev.filter((tab) => tab.name !== name);
      if (activeTabName === name) {
        setActiveTabName(newTabs.length > 0 ? newTabs[newTabs.length - 1].name : null);
      }
      return newTabs;
    });
  }, [activeTabName]);

  const handleTabChange = useCallback((name: string) => {
    setActiveTabName(name);
  }, []);

  const renderMetadataItem = (item: MetadataItem, index: number) => {
    switch (item.type) {
      case 'simple':
        return (
          <PropertyItemSimple
            key={`${item.label}-${index}`}
            label={item.label}
            value={item.value}
          />
        );
      case 'icon':
        return (
          <PropertyItemWithIcon
            key={`${item.label}-${index}`}
            label={item.label}
            icon={getIcon(item.icon)}
            value={item.value}
            version={item.version}
          />
        );
      case 'code':
        return (
          <PropertyItemCode
            key={`${item.label}-${index}`}
            label={item.label}
            value={item.value}
            expandable={item.expandable}
            onOpenInPanel={handleOpenProperty}
          />
        );
      default:
        return null;
    }
  };

  const containerClass = `${styles.container} ${isStacked ? styles.stacked : ''} ${isDragging ? styles.dragging : ''}`;

  const metadataPaneStyle = isStacked
    ? { height: `${splitRatio}%` }
    : { width: `${splitRatio}%` };
  const editorPaneStyle = isStacked
    ? { height: `${100 - splitRatio}%` }
    : { width: `${100 - splitRatio}%` };

  return (
    <div ref={containerRef} className={containerClass}>
      {/* Metadata Pane */}
      <div className={styles.metadataPane} style={metadataPaneStyle}>
        <ScrollArea className={styles.scrollArea}>
          <div className={styles.content}>
            {/* 1. JamMetaDataSection card (Navigation + Custom Metadata) — video jams only, not iOS */}
            {navigationData && activeEvent && (
              <JamMetaDataSection>
                <NavigationSection
                  navigationData={navigationData}
                  activeEvent={activeEvent}
                  onEventClick={handleEventClick}
                />
                <CustomMetaDataSection
                  state={settings.customMetadataState}
                  customProperties={displayedCustomProperties}
                  selectedPropertyName={activeTabName}
                  onPropertyClick={handleOpenProperty}
                />
                {/* Intercom-specific metadata inside the card */}
                {settings.origin === 'intercom' && (
                  <IntercomMetaDataSection
                    metadata={INTERCOM_METADATA}
                    onPropertyClick={handleOpenProperty}
                  />
                )}
              </JamMetaDataSection>
            )}

            {/* 2. Device section (outside the card) */}
            <MetadataSection>
              <PropertyItemTimestamp
                timestamp={timestamp}
                timezone={timezone}
                onTimezoneChange={onTimezoneChange}
              />
              {deviceMetadata.map((item, index) => renderMetadataItem(item, index))}
            </MetadataSection>
          </div>
        </ScrollArea>
      </div>

      {/* Divider - works in both layouts */}
      <div
        ref={dividerRef}
        className={styles.divider}
        onMouseDown={handleMouseDown}
      >
        <div className={styles.dividerHandle} />
      </div>

      {/* Editor Pane - always visible */}
      <div className={styles.editorPane} style={editorPaneStyle}>
        <CodeEditorPanel
          tabs={openTabs}
          activeTabName={activeTabName}
          onTabChange={handleTabChange}
          onTabClose={handleCloseTab}
          layout={layout}
        />
      </div>
    </div>
  );
}
