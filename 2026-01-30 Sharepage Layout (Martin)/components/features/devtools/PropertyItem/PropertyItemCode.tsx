'use client';

import { useState } from 'react';
import { Flex, Text, Tooltip } from '@radix-ui/themes';
import { IconButton } from '@/components/ui';
import { CopyIcon } from '@/components/icons/CopyIcon';
import { PropertyItem } from './PropertyItem';
import styles from './PropertyItem.module.css';

interface PropertyItemCodeProps {
  label: string;
  value: string;
  expandable?: boolean;
  onOpenInPanel?: (label: string, value: string) => void;
  isSelected?: boolean;
}

export function PropertyItemCode({
  label,
  value,
  expandable = false,
  onOpenInPanel,
  isSelected,
}: PropertyItemCodeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClick = () => {
    onOpenInPanel?.(label, value);
  };

  return (
    <PropertyItem
      label={label}
      isSelected={isSelected}
      onClick={onOpenInPanel ? handleClick : undefined}
    >
      <Flex className={styles.codeWrapper}>
        <Text size="1" className={styles.codeValue}>
          {value.length > 40 ? `${value.slice(0, 37)}...` : value}
        </Text>

        <Tooltip content={copied ? 'Copied!' : 'Copy'}>
          <IconButton
            variant="ghost"
            size="1"
            color="gray"
            onClick={handleCopy}
            className={styles.copyButton}
          >
            <CopyIcon />
          </IconButton>
        </Tooltip>
      </Flex>
    </PropertyItem>
  );
}
