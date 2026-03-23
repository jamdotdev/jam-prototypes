'use client';

import { Flex, Text, Switch, Slider } from '@radix-ui/themes';
import { useSettingsStore } from '@/stores/settingsStore';
import styles from './controls.module.css';

export function CommentsControl() {
  const hasComments = useSettingsStore((s) => s.hasComments);
  const commentCount = useSettingsStore((s) => s.commentCount);
  const setComments = useSettingsStore((s) => s.setComments);

  return (
    <Flex direction="column" gap="2">
      <Flex align="center" justify="between" gap="3" minHeight="40px">
        <Text as="label" size="1" weight="medium" color="gray">
          Comments
        </Text>
        <Switch
          checked={hasComments}
          onCheckedChange={(checked) => setComments(checked, commentCount)}
          size="1"
        />
      </Flex>
      {hasComments && (
        <Flex align="center" gap="3" className={styles.controllerContent}>
          <Slider
            value={[commentCount]}
            onValueChange={([value]) => setComments(true, value)}
            min={1}
            max={10}
            step={1}
            size="1"
            style={{ flex: 1 }}
          />
          <Text size="1" color="gray" style={{ minWidth: 20, textAlign: 'right' }}>
            {commentCount}
          </Text>
        </Flex>
      )}
    </Flex>
  );
}
