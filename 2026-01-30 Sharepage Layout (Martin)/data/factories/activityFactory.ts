import type { Activity, IntegrationType } from '@/types/activity.types';
import type { JamOrigin } from '@/types/jam.types';
import { getCreator, getAnonymousUser, getPresetUsers } from './userFactory';

interface ActivityFactoryOptions {
  integrations: IntegrationType[];
  origin: JamOrigin;
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
  const { integrations, origin, includeCreation = true } = options;
  const activities: Activity[] = [];
  const users = getPresetUsers();
  let idx = 0;

  if (includeCreation) {
    if (origin === 'recording_link') {
      // Recording links show 2 creation activities
      activities.push({
        id: `activity-${++idx}`,
        type: 'jam_created',
        userId: getCreator().id,
        timestamp: createTimestamp(24 * 60),
        data: { kind: 'recording_link_request', referenceLabel: 'Bug Report Form' },
      });
      activities.push({
        id: `activity-${++idx}`,
        type: 'jam_created',
        userId: getAnonymousUser().id,
        timestamp: createTimestamp(24 * 60 - 1),
        data: { kind: 'jam_created', origin: 'recording_link' },
      });
    } else {
      activities.push({
        id: `activity-${++idx}`,
        type: 'jam_created',
        userId: getCreator().id,
        timestamp: createTimestamp(24 * 60),
        data: { kind: 'jam_created', origin },
      });
    }
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
