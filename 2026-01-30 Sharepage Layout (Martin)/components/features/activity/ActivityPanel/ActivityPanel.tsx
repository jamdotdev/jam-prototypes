'use client';

import { Flex, Text } from '@radix-ui/themes';
import type { Activity } from '@/types/activity.types';
import type { Comment } from '@/types/comment.types';
import type { User } from '@/types/user.types';
import { ActivityItem } from '../ActivityItem';
import { CommentItem } from '../CommentItem';
import styles from './ActivityPanel.module.css';

interface ActivityPanelProps {
  activities: Activity[];
  comments: Comment[];
  getUserById: (id: string) => User | undefined;
  currentVideoTime?: number;
  onEditComment?: (id: string, newText: string) => void;
  onDeleteComment?: (id: string) => void;
}

export function ActivityPanel({
  activities,
  comments,
  getUserById,
  onEditComment,
  onDeleteComment,
}: ActivityPanelProps) {
  return (
    <Flex direction="column" gap="1" className={styles.activityPanel}>
      {/* Section Header */}
      <Flex
        align="center"
        px="3"
        py="1"
        className={styles.sectionHeader}
      >
        <Text size="2" color="gray">
          Activity
        </Text>
      </Flex>

      {/* Activity Items */}
      {activities.map((activity) => {
        const user = getUserById(activity.userId);
        return (
          <ActivityItem
            key={activity.id}
            activity={activity}
            user={user}
          />
        );
      })}

      {/* Comments */}
      {comments.map((comment) => {
        const user = getUserById(comment.userId);
        return (
          <CommentItem
            key={comment.id}
            comment={comment}
            user={user}
            onEdit={onEditComment}
            onDelete={onDeleteComment}
          />
        );
      })}
    </Flex>
  );
}
