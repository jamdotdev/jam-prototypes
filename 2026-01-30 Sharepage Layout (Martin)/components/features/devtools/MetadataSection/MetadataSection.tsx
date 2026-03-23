'use client';

import { Flex } from '@radix-ui/themes';
import styles from './MetadataSection.module.css';

interface MetadataSectionProps {
  children: React.ReactNode;
}

export function MetadataSection({
  children,
}: MetadataSectionProps) {
  return (
    <Flex direction="column" className={styles.section}>
      {children}
    </Flex>
  );
}
