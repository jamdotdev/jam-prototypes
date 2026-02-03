import type { Activity, IntegrationType } from '@/types/activity.types';
import { getCreator, getPresetUsers } from './userFactory';

interface ActivityFactoryOptions {
  integrations: IntegrationType[];
  includeCreation?: boolean;
}

function createTimestamp(minutesAgo: number): Date {
  return new Date(Date.now() - minutesAgo * 60 * 1000);
}

const INTEGRATION_ISSUE_PREFIXES: Record<IntegrationType, string> = {
  linear: 'JAM',
  slack: '#bug-reports',
  jira: 'BUG',
  github: 'GH',
  asana: 'TASK',
};

export function generateActivities(options: ActivityFactoryOptions): Activity[] {
  const { integrations, includeCreation = true } = options;
  const activities: Activity[] = [];
  const users = getPresetUsers();
  let idx = 0;

  if (includeCreation) {
    activities.push({
      id: `activity-${++idx}`,
      type: 'jam_created',
      userId: getCreator().id,
      timestamp: createTimestamp(24 * 60),
      data: { kind: 'jam_created' },
    });
  }

  integrations.forEach((integration, i) => {
    const user = users[(i + 1) % users.length];
    // Use deterministic issue numbers to avoid hydration mismatch
    const issueNumber = 142 + i;

    activities.push({
      id: `activity-${++idx}`,
      type: 'integration',
      userId: user.id,
      timestamp: createTimestamp(4 * 60 - i * 30),
      data: {
        kind: 'integration',
        integration,
        issueId: `${INTEGRATION_ISSUE_PREFIXES[integration]}-${issueNumber}`,
        issueUrl: '#',
      },
    });
  });

  return activities;
}
