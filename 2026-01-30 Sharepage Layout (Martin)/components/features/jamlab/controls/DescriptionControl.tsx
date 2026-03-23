'use client';

import { Flex, Text, Switch, TextArea } from '@radix-ui/themes';
import { useSettingsStore } from '@/stores/settingsStore';
import styles from './controls.module.css';

export function DescriptionControl() {
  const hasDescription = useSettingsStore((s) => s.hasDescription);
  const descriptionText = useSettingsStore((s) => s.descriptionText);
  const setDescription = useSettingsStore((s) => s.setDescription);

  return (
    <Flex direction="column" gap="2">
      <Flex align="center" justify="between" gap="3" minHeight="40px">
        <Text as="label" size="1" weight="medium" color="gray">
          Description
        </Text>
        <Switch
          checked={hasDescription}
          onCheckedChange={(checked) => setDescription(checked, descriptionText)}
          size="1"
        />
      </Flex>
      {hasDescription && (
        <Flex direction="column" className={styles.controllerContent}>
          <TextArea
            placeholder="Enter description (or leave empty for default)..."
            value={descriptionText}
            onChange={(e) => setDescription(true, e.target.value)}
            rows={3}
            size="1"
          />
        </Flex>
      )}
    </Flex>
  );
}
