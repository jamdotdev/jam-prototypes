'use client';

import { Flex, Text, SegmentedControl, TextField } from '@radix-ui/themes';
import { useSettingsStore } from '@/stores/settingsStore';
import styles from './controls.module.css';

export function TitleControl() {
  const title = useSettingsStore((s) => s.title);
  const customTitle = useSettingsStore((s) => s.customTitle);
  const setTitle = useSettingsStore((s) => s.setTitle);

  return (
    <Flex direction="column" gap="2">
      <Flex align="center" justify="between" gap="3" minHeight="40px">
        <Text as="label" size="1" weight="medium" color="gray">
          Title
        </Text>
        <SegmentedControl.Root
          value={title}
          onValueChange={(value) => setTitle(value as 'default' | 'custom', customTitle)}
          size="1"
        >
          <SegmentedControl.Item value="default">Default</SegmentedControl.Item>
          <SegmentedControl.Item value="custom">Custom</SegmentedControl.Item>
        </SegmentedControl.Root>
      </Flex>
      {title === 'custom' && (
        <Flex direction="column" className={styles.controllerContent}>
          <TextField.Root
            placeholder="Enter custom title..."
            value={customTitle}
            onChange={(e) => setTitle('custom', e.target.value)}
            size="1"
          />
        </Flex>
      )}
    </Flex>
  );
}
