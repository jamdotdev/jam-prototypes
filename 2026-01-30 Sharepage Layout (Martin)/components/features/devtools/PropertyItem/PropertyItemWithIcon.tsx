'use client';

import { Flex, Text } from '@radix-ui/themes';
import { PropertyItem } from './PropertyItem';
import styles from './PropertyItem.module.css';

interface PropertyItemWithIconProps {
  label: string;
  icon: React.ReactNode;
  value: string;
  version?: string;
}

export function PropertyItemWithIcon({
  label,
  icon,
  value,
  version,
}: PropertyItemWithIconProps) {
  return (
    <PropertyItem label={label}>
      <Flex gap="1" align="center" className={styles.iconValue}>
        <div className={styles.icon}>{icon}</div>
        <Text size="1">{value}</Text>
        {version && (
          <Text size="1" color="gray">
            {version}
          </Text>
        )}
      </Flex>
    </PropertyItem>
  );
}
