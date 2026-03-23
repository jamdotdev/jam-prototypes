'use client';

import { useMemo } from 'react';
import { Flex, Text, Select } from '@radix-ui/themes';
import { useSettingsStore } from '@/stores/settingsStore';
import type { JamOrigin } from '@/types/jam.types';

const ORIGIN_OPTIONS: { value: JamOrigin; label: string }[] = [
  { value: 'extension', label: 'Browser Extension' },
  { value: 'recording_link', label: 'Recording Link' },
  { value: 'intercom', label: 'Intercom' },
  { value: 'ios', label: 'iOS App' },
];

const SCREENSHOT_ORIGINS: JamOrigin[] = ['extension', 'ios'];

export function OriginControl() {
  const origin = useSettingsStore((s) => s.origin);
  const jamType = useSettingsStore((s) => s.jamType);
  const setOrigin = useSettingsStore((s) => s.setOrigin);

  const filteredOptions = useMemo(
    () =>
      jamType === 'screenshot'
        ? ORIGIN_OPTIONS.filter((o) => SCREENSHOT_ORIGINS.includes(o.value))
        : ORIGIN_OPTIONS,
    [jamType]
  );

  return (
    <Flex align="center" justify="between" gap="3" minHeight="40px">
      <Text as="label" size="1" weight="medium" color="gray">
        Origin
      </Text>
      <Select.Root value={origin} onValueChange={(value) => setOrigin(value as JamOrigin)} size="1">
        <Select.Trigger />
        <Select.Content>
          {filteredOptions.map((option) => (
            <Select.Item key={option.value} value={option.value}>
              {option.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    </Flex>
  );
}
