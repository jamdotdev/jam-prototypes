'use client';

import { Flex, Text } from '@radix-ui/themes';
import styles from './PropertyItem.module.css';

interface PropertyItemProps {
  label: string;
  children: React.ReactNode;
  isSelected?: boolean;
  onClick?: () => void;
}

export function PropertyItem({ label, children, isSelected, onClick }: PropertyItemProps) {
  const className = [
    styles.propertyItem,
    isSelected ? styles.selected : '',
    onClick ? styles.clickable : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Flex
      align="center"
      justify="between"
      className={className}
      onClick={onClick}
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
