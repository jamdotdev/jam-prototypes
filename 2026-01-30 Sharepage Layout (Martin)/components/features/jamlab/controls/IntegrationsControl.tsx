'use client';

import { Flex, Text, Switch, Checkbox, Grid } from '@radix-ui/themes';
import { useSettingsStore } from '@/stores/settingsStore';
import type { IntegrationType } from '@/types/activity.types';
import styles from './controls.module.css';

const INTEGRATIONS: { value: IntegrationType; label: string }[] = [
  { value: 'linear', label: 'Linear' },
  { value: 'slack', label: 'Slack' },
  { value: 'jira', label: 'Jira' },
  { value: 'github', label: 'GitHub' },
  { value: 'asana', label: 'Asana' },
];

export function IntegrationsControl() {
  const hasIntegrations = useSettingsStore((s) => s.hasIntegrations);
  const integrations = useSettingsStore((s) => s.integrations);
  const setIntegrations = useSettingsStore((s) => s.setIntegrations);
  const toggleIntegration = useSettingsStore((s) => s.toggleIntegration);

  return (
    <Flex direction="column" gap="2">
      <Flex align="center" justify="between" gap="3" minHeight="40px">
        <Text as="label" size="1" weight="medium" color="gray">
          Integrations
        </Text>
        <Switch
          checked={hasIntegrations}
          onCheckedChange={setIntegrations}
          size="1"
        />
      </Flex>
      {hasIntegrations && (
        <Flex direction="column" className={styles.controllerContent}>
          <Grid columns="2" gap="2">
            {INTEGRATIONS.map((integration) => (
              <Flex key={integration.value} align="center" gap="2" asChild>
                <Text as="label" size="1">
                  <Checkbox
                    checked={integrations.includes(integration.value)}
                    onCheckedChange={() => toggleIntegration(integration.value)}
                    size="1"
                  />
                  {integration.label}
                </Text>
              </Flex>
            ))}
          </Grid>
        </Flex>
      )}
    </Flex>
  );
}
