'use client';

import { Flex, Text } from '@radix-ui/themes';
import { IconButton } from '@/components/ui';
import { DotsHorizontalIcon } from '@/components/icons/DotsHorizontalIcon';
import styles from './MetadataSection.module.css';

interface MetadataSectionProps {
  title: string;
  children: React.ReactNode;
  onMenuClick?: () => void;
}

export function MetadataSection({
  title,
  children,
  onMenuClick,
}: MetadataSectionProps) {
  return (
    <Flex direction="column" gap="2" className={styles.section}>
      <Flex
        align="center"
        justify="between"
        px="2"
        py="1"
        className={styles.header}
      >
        <Text size="2" color="gray">
          {title}
        </Text>
        {onMenuClick && (
          <IconButton
            variant="ghost"
            size="1"
            color="gray"
            onClick={onMenuClick}
          >
            <DotsHorizontalIcon />
          </IconButton>
        )}
      </Flex>
      <Flex direction="column" className={styles.content}>
        {children}
      </Flex>
    </Flex>
  );
}
