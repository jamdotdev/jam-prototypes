'use client';

import { Badge, Tooltip } from '@radix-ui/themes';

interface TimeBadgeProps {
  seconds: number;
  className?: string;
}

function formatVideoTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function TimeBadge({ seconds, className }: TimeBadgeProps) {
  return (
    <Tooltip content={`Jump to ${formatVideoTime(seconds)} in the video`}>
      <Badge variant="soft" color="gray" size="1" className={className}>
        {formatVideoTime(seconds)}
      </Badge>
    </Tooltip>
  );
}
