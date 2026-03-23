'use client';

import { Flex, Text } from '@radix-ui/themes';
import type { MetadataItem } from '@/data/constants/devToolsDefaults';
import {
  PropertyItemSimple,
  PropertyItemCode,
} from '../PropertyItem';

interface IntercomMetaDataSectionProps {
  metadata: MetadataItem[];
  onPropertyClick?: (name: string, value: string) => void;
}

export function IntercomMetaDataSection({
  metadata,
  onPropertyClick,
}: IntercomMetaDataSectionProps) {
  return (
    <Flex direction="column" gap="1">
      {/* Header */}
      <Flex align="center" px="2" py="1">
        <Text size="1" weight="medium" color="gray">
          Intercom metadata
        </Text>
      </Flex>

      {/* Property list */}
      <Flex direction="column">
        {metadata.map((item, index) => {
          switch (item.type) {
            case 'simple':
              return (
                <PropertyItemSimple
                  key={`${item.label}-${index}`}
                  label={item.label}
                  value={item.value}
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
                />
              );
            default:
              return null;
          }
        })}
      </Flex>
    </Flex>
  );
}
