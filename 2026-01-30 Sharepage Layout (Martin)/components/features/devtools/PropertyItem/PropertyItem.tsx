'use client';

import { Flex, Text } from '@radix-ui/themes';
import styles from './PropertyItem.module.css';

interface PropertyItemProps {
  label: string;
  children: React.ReactNode;
}

export function PropertyItem({ label, children }: PropertyItemProps) {
  return (
    <Flex
      align="center"
      justify="between"
      className={styles.propertyItem}
    >
      <Flex className={styles.label} px="1">
        <Text size="1" color="gray">
          {label}
        </Text>
      </Flex>
      <Flex className={styles.value} pl="2">
        {children}
      </Flex>
    </Flex>
  );
}
