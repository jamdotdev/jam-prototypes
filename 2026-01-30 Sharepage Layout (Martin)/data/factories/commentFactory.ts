import type { Comment } from '@/types/comment.types';
import type { JamType } from '@/types/jam.types';
import { getPresetUsers } from './userFactory';

interface CommentFactoryOptions {
  count: number;
  jamType: JamType;
  videoDuration?: number;
}

const COMMENT_TEMPLATES = [
  'Created a Linear ticket for this!',
  'I can reproduce this issue on my end. The error occurs when clicking the submit button rapidly. Looking into the debounce logic now.',
  "Found the root cause - the form validation is running async but we're not awaiting it before submission.",
  'Thanks!',
  'This happens on Safari too, not just Chrome.',
  'Should we add this to the sprint backlog?',
  'Good catch! I think this was introduced in the last release.',
];

function createTimestamp(minutesAgo: number): Date {
  return new Date(Date.now() - minutesAgo * 60 * 1000);
}

export function generateComments(options: CommentFactoryOptions): Comment[] {
  const { count, jamType, videoDuration = 120 } = options;
  const users = getPresetUsers();
  const comments: Comment[] = [];

  const timeSlots = [240, 30, 15, 5, 2, 1];

  // Deterministic video times to avoid hydration mismatch
  const videoTimes = [12, 45, 67, 23, 89, 34, 56];

  for (let i = 0; i < count; i++) {
    const user = users[(i + 1) % users.length];
    // Use deterministic values to avoid hydration mismatch
    const minutesAgo = timeSlots[i] ?? (10 + i * 5);

    comments.push({
      id: `comment-${i + 1}`,
      userId: user.id,
      text: COMMENT_TEMPLATES[i % COMMENT_TEMPLATES.length],
      videoTime: jamType === 'video' ? videoTimes[i % videoTimes.length] : null,
      timestamp: createTimestamp(minutesAgo),
      editedAt: null,
      reactions: [],
    });
  }

  return comments;
}
