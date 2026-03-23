'use client';

import { Flex, Text, SegmentedControl } from '@radix-ui/themes';
import { useSettingsStore } from '@/stores/settingsStore';

const STATES = ['configured', 'default', 'error'] as const;
const LABELS: Record<typeof STATES[number], string> = {
  configured: 'Configured',
  default: 'Default',
  error: 'Error',
};

export function CustomMetadataStateControl() {
  const jamType = useSettingsStore((s) => s.jamType);
  const customMetadataState = useSettingsStore((s) => s.customMetadataState);
  const setCustomMetadataState = useSettingsStore((s) => s.setCustomMetadataState);

  if (jamType !== 'video') return null;

  return (
    <Flex direction="column" gap="2">
      <Flex align="center" justify="between" gap="3" minHeight="40px">
        <Text as="label" size="1" weight="medium" color="gray">
          Custom Metadata
        </Text>
      </Flex>
      <SegmentedControl.Root
        value={customMetadataState}
        onValueChange={(value) =>
          setCustomMetadataState(value as 'configured' | 'default' | 'error')
        }
        size="1"
      >
        {STATES.map((state) => (
          <SegmentedControl.Item key={state} value={state}>
            {LABELS[state]}
          </SegmentedControl.Item>
        ))}
      </SegmentedControl.Root>
    </Flex>
  );
}
