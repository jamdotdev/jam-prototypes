'use client';

import { Text } from '@radix-ui/themes';
import { PropertyItem } from './PropertyItem';
import styles from './PropertyItem.module.css';

interface PropertyItemSimpleProps {
  label: string;
  value: string;
}

export function PropertyItemSimple({ label, value }: PropertyItemSimpleProps) {
  return (
    <PropertyItem label={label}>
      <Text size="1" className={styles.valueText}>
        {value}
      </Text>
    </PropertyItem>
  );
}
