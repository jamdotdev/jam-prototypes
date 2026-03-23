'use client';

import { Flex } from '@radix-ui/themes';
import styles from './JamMetaDataSection.module.css';

interface JamMetaDataSectionProps {
  children: React.ReactNode;
}

export function JamMetaDataSection({ children }: JamMetaDataSectionProps) {
  return (
    <Flex direction="column" gap="3" p="1" className={styles.card}>
      {children}
    </Flex>
  );
}
