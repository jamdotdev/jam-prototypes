'use client';

import { useState } from 'react';
import { Box, Flex, Text, Tooltip } from '@radix-ui/themes';
import { IconButton } from '@/components/ui';
import { CopyIcon } from '@/components/icons/CopyIcon';
import type { MetadataItem } from '@/data/constants/devToolsDefaults';
import {
  PropertyItemSimple,
  PropertyItemWithIcon,
  PropertyItemCode,
} from '../PropertyItem';
import styles from './CustomMetaDataSection.module.css';

interface CustomMetaDataSectionProps {
  state: 'configured' | 'default' | 'error';
  customProperties?: MetadataItem[];
  selectedPropertyName?: string | null;
  onPropertyClick?: (name: string, value: string) => void;
  onCopyAll?: () => void;
  errorMessage?: string;
}

const CODE_SNIPPET = `jam.metadata.setData({
  key: "value"
})`;

export function CustomMetaDataSection({
  state,
  customProperties = [],
  selectedPropertyName,
  onPropertyClick,
  onCopyAll,
  errorMessage = 'metadata_script_timeout',
}: CustomMetaDataSectionProps) {
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyAll = () => {
    const text = customProperties
      .map((p) => `${p.label}: ${p.value}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
    onCopyAll?.();
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(CODE_SNIPPET);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const renderItem = (item: MetadataItem, index: number) => {
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
            icon={item.icon}
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
            onOpenInPanel={onPropertyClick}
            isSelected={selectedPropertyName === item.label}
          />
        );
      default:
        return null;
    }
  };

  if (state === 'configured') {
    // Filter out URL items — URL is shown in the Navigation section
    const filteredProperties = customProperties.filter(
      (item) => !(item.type === 'simple' && item.label === 'URL')
    );

    return (
      <Flex direction="column" gap="1">
        {/* Header */}
        <Flex align="center" justify="between" px="2" py="1">
          <Text size="1" weight="medium" color="gray">
            Custom metadata
          </Text>
          {filteredProperties.length > 0 && (
            <Tooltip content={copiedAll ? 'Copied!' : 'Copy all'}>
              <IconButton
                variant="ghost"
                size="1"
                color="gray"
                onClick={handleCopyAll}
              >
                <CopyIcon size={14} />
              </IconButton>
            </Tooltip>
          )}
        </Flex>

        {/* Property list */}
        <Flex direction="column">
          {filteredProperties.map((item, index) => renderItem(item, index))}
        </Flex>
      </Flex>
    );
  }

  if (state === 'default') {
    return (
      <Flex direction="column" gap="1">
        {/* Header with docs link */}
        <Flex align="center" gap="1" px="2" py="1">
          <Text size="1" weight="medium" color="gray">
            Custom metadata
          </Text>
          <Text
            size="1"
            color="blue"
            asChild
          >
            <a
              href="https://jam.dev/docs"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.docsLink}
            >
              jam.dev/docs
            </a>
          </Text>
        </Flex>

        {/* Code block */}
        <Flex
          align="center"
          gap="2"
          px="2"
          py="1"
          className={styles.codeBlock}
        >
          <Text size="1" className={styles.codeText}>
            {CODE_SNIPPET}
          </Text>
          <Tooltip content={copiedCode ? 'Copied!' : 'Copy'}>
            <IconButton
              variant="ghost"
              size="1"
              color="gray"
              onClick={handleCopyCode}
              className={styles.codeBlockCopyButton}
            >
              <CopyIcon size={14} />
            </IconButton>
          </Tooltip>
        </Flex>
      </Flex>
    );
  }

  // Error state
  return (
    <Flex direction="column" gap="1">
      {/* Header */}
      <Flex px="2" py="1">
        <Text size="1" weight="medium" color="gray">
          Custom metadata unavailable
        </Text>
      </Flex>

      {/* Error row */}
      <Flex align="center" px="2" py="1">
        <Box flexShrink="0" minWidth="96px" asChild>
          <Flex align="center" gap="1">
            <Text size="1" color="gray">
              Error
            </Text>
          </Flex>
        </Box>
        <Box flexGrow="1" asChild>
          <Flex align="center" pl="2">
            <Text size="1" color="red" className={styles.errorValue}>
              {errorMessage}
            </Text>
          </Flex>
        </Box>
      </Flex>
    </Flex>
  );
}
