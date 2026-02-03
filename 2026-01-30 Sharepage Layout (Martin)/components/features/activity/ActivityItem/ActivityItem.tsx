'use client';

import { Avatar, Flex, Text, Link } from '@radix-ui/themes';
import type { Activity, ActivityData, IntegrationType } from '@/types/activity.types';
import type { User } from '@/types/user.types';
import { Timestamp } from '@/components/ui/Timestamp/Timestamp';
import { JamIcon } from '@/components/icons/JamIcon';
import { LinearIcon } from '@/components/icons/LinearIcon';
import styles from './ActivityItem.module.css';

interface ActivityItemProps {
  activity: Activity;
  user: User | undefined;
}

// Get icon based on activity data
function getActivityIcon(data: ActivityData): React.ReactNode {
  switch (data.kind) {
    case 'jam_created':
      return <JamIcon />;
    case 'integration':
      return getIntegrationIcon(data.integration);
    default:
      return null;
  }
}

// Get icon for integration type
function getIntegrationIcon(integration: IntegrationType): React.ReactNode {
  switch (integration) {
    case 'linear':
      return <LinearIcon />;
    // Add more integration icons as they become available
    // case 'slack': return <SlackIcon />;
    // case 'jira': return <JiraIcon />;
    // case 'github': return <GithubIcon />;
    // case 'asana': return <AsanaIcon />;
    default:
      return null;
  }
}

// Get action text based on activity data
function getActionText(data: ActivityData): string {
  switch (data.kind) {
    case 'jam_created':
      return 'created the Jam';
    case 'integration':
      return `created a ${capitalizeFirst(data.integration)} issue`;
    case 'status_change':
      return `changed status from ${data.from} to ${data.to}`;
    case 'assignment':
      return 'assigned this';
    default:
      return '';
  }
}

// Get link info based on activity data
function getActivityLink(data: ActivityData): { text: string; href: string } | undefined {
  if (data.kind === 'integration') {
    return { text: data.issueId, href: data.issueUrl };
  }
  return undefined;
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function ActivityItem({ activity, user }: ActivityItemProps) {
  const icon = getActivityIcon(activity.data);
  const actionText = getActionText(activity.data);
  const link = getActivityLink(activity.data);
  const userName = user?.name ?? 'Unknown';

  return (
    <Flex gap="2" align="center" className={styles.activityItem}>
      <Flex
        align="center"
        justify="center"
        className={styles.iconWrapper}
      >
        {icon ? (
          <div className={styles.integrationIcon}>{icon}</div>
        ) : (
          <Avatar
            src={user?.avatar}
            fallback={userName.charAt(0).toUpperCase()}
            size="1"
            radius="full"
          />
        )}
      </Flex>

      <Flex align="center" wrap="wrap" gap="1" className={styles.content}>
        <Text size="1" weight="medium" color="gray">
          {userName}
        </Text>
        <Text size="1" color="gray">
          {actionText}
        </Text>
        {link && (
          <Link href={link.href} size="1" color="blue" underline="always">
            {link.text}
          </Link>
        )}
        <Text size="1" color="gray">
          ·
        </Text>
        <Timestamp date={activity.timestamp} />
      </Flex>
    </Flex>
  );
}
