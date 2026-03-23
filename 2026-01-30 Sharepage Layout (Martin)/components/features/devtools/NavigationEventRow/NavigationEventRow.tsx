'use client';

import { useState } from 'react';
import { Box, Flex, Text, Tooltip } from '@radix-ui/themes';
import { IconButton } from '@/components/ui';
import { CopyIcon } from '@/components/icons/CopyIcon';
import type { NavigationEvent } from '@/types/navigation.types';
import styles from './NavigationEventRow.module.css';

interface NavigationEventRowProps {
  event: NavigationEvent;
  isSelected: boolean;
  showIndicator?: boolean;
  timestampLabel?: string;
  onCopy?: () => void;
  onClick?: () => void;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function NavigationEventRow({
  event,
  isSelected,
  showIndicator = true,
  timestampLabel,
  onCopy,
  onClick,
}: NavigationEventRowProps) {
  const [copied, setCopied] = useState(false);

  const rowClass = [
    styles.row,
    isSelected ? styles.selected : styles.unselected,
  ]
    .filter(Boolean)
    .join(' ');

  const indicatorClass = [
    styles.indicator,
    isSelected ? styles.indicatorActive : styles.indicatorInactive,
  ].join(' ');

  const urlClass = isSelected ? styles.urlSelected : styles.urlUnselected;

  const label = timestampLabel ?? formatTime(event.timestamp);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(event.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.();
  };

  return (
    <Flex align="center" px="2" py="1" className={rowClass} onClick={onClick}>
      <Box flexShrink="0" minWidth="96px" asChild>
        <Flex align="center" gap="1">
          {showIndicator && <span className={indicatorClass} />}
          <Text size="1" color={isSelected ? undefined : 'gray'}>
            {label}
          </Text>
        </Flex>
      </Box>
      <Box flexGrow="1" asChild>
        <Flex align="center" pl="2">
          <Text size="1" truncate className={urlClass}>
            {event.url}
          </Text>
        </Flex>
      </Box>
      <Tooltip content={copied ? 'Copied!' : 'Copy URL'}>
        <IconButton
          variant="ghost"
          size="1"
          color="gray"
          className={styles.copyButton}
          onClick={handleCopy}
        >
          <CopyIcon size={14} />
        </IconButton>
      </Tooltip>
    </Flex>
  );
}
