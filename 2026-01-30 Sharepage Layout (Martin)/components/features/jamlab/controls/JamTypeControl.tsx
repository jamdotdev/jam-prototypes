'use client';

import { Flex, Text, SegmentedControl } from '@radix-ui/themes';
import { useSettingsStore } from '@/stores/settingsStore';
import type { JamType } from '@/types/jam.types';

export function JamTypeControl() {
  const jamType = useSettingsStore((s) => s.jamType);
  const setJamType = useSettingsStore((s) => s.setJamType);

  return (
    <Flex align="center" justify="between" gap="3" minHeight="40px">
      <Text as="label" size="1" weight="medium" color="gray">
        Content Type
      </Text>
      <SegmentedControl.Root
        value={jamType}
        onValueChange={(value) => setJamType(value as JamType)}
        size="1"
      >
        <SegmentedControl.Item value="video">Video</SegmentedControl.Item>
        <SegmentedControl.Item value="screenshot">Screenshot</SegmentedControl.Item>
      </SegmentedControl.Root>
    </Flex>
  );
}
