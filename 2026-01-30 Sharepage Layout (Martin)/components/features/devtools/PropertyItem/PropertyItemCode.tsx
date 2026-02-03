'use client';

import { useState } from 'react';
import { Flex, Text, Tooltip, Code } from '@radix-ui/themes';
import { IconButton } from '@/components/ui';
import { CopyIcon } from '@/components/icons/CopyIcon';
import { ExpandIcon } from '@/components/icons/ExpandIcon';
import { PropertyItem } from './PropertyItem';
import styles from './PropertyItem.module.css';

interface PropertyItemCodeProps {
  label: string;
  value: string;
  expandable?: boolean;
  onOpenInPanel?: (label: string, value: string) => void;
}


export function PropertyItemCode({
  label,
  value,
  expandable = false,
  onOpenInPanel,
}: PropertyItemCodeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenInPanel = () => {
    onOpenInPanel?.(label, value);
  };

  const isLongValue = value.length > 40 || value.includes('{');
  const shouldShowOpenInPanel = (expandable || isLongValue) && onOpenInPanel;

  return (
    <PropertyItem label={label}>
      <Flex className={styles.codeWrapper}>
        <Code
          size="1"
          color="teal"
          className={styles.codeValue}
        >
          {value.length > 40 ? `${value.slice(0, 37)}...` : value}
        </Code>

        <Flex gap="1" align="center">
          {shouldShowOpenInPanel && (
            <Tooltip content="Open in panel">
              <IconButton
                variant="ghost"
                size="1"
                color="gray"
                onClick={handleOpenInPanel}
                className={styles.expandButton}
              >
                <ExpandIcon />
              </IconButton>
            </Tooltip>
          )}

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
      </Flex>
    </PropertyItem>
  );
}
