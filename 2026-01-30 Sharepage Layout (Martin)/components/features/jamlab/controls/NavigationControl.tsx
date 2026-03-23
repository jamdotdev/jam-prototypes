'use client';

import { Flex, Text, Slider } from '@radix-ui/themes';
import { useSettingsStore } from '@/stores/settingsStore';
import styles from './controls.module.css';

export function NavigationControl() {
  const jamType = useSettingsStore((s) => s.jamType);
  const tabCount = useSettingsStore((s) => s.tabCount);
  const urlChangesPerTab = useSettingsStore((s) => s.urlChangesPerTab);
  const setTabCount = useSettingsStore((s) => s.setTabCount);
  const setUrlChangesPerTab = useSettingsStore((s) => s.setUrlChangesPerTab);

  if (jamType !== 'video') return null;

  return (
    <Flex direction="column" gap="2">
      {/* Browser Tabs */}
      <Flex align="center" justify="between" gap="3" minHeight="40px">
        <Text as="label" size="1" weight="medium" color="gray">
          Browser Tabs
        </Text>
        <Text size="1" color="gray">
          {tabCount}
        </Text>
      </Flex>
      <Flex align="center" gap="3" className={styles.controllerContent}>
        <Slider
          value={[tabCount]}
          onValueChange={([value]) => setTabCount(value)}
          min={1}
          max={4}
          step={1}
          size="1"
          style={{ flex: 1 }}
        />
      </Flex>

      {/* URLs per Tab */}
      <Flex align="center" justify="between" gap="3" minHeight="40px">
        <Text as="label" size="1" weight="medium" color="gray">
          URLs per Tab
        </Text>
        <Text size="1" color="gray">
          {urlChangesPerTab}
        </Text>
      </Flex>
      <Flex align="center" gap="3" className={styles.controllerContent}>
        <Slider
          value={[urlChangesPerTab]}
          onValueChange={([value]) => setUrlChangesPerTab(value)}
          min={1}
          max={5}
          step={1}
          size="1"
          style={{ flex: 1 }}
        />
      </Flex>
    </Flex>
  );
}
