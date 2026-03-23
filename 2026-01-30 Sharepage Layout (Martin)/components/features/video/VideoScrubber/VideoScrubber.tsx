'use client';

import { useCallback, useEffect } from 'react';
import { Flex, Text, Slider, IconButton } from '@radix-ui/themes';
import { useVideoPlaybackStore } from '@/stores/videoPlaybackStore';
import styles from './VideoScrubber.module.css';

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function VideoScrubber() {
  const currentTime = useVideoPlaybackStore((s) => s.currentTime);
  const duration = useVideoPlaybackStore((s) => s.duration);
  const isPlaying = useVideoPlaybackStore((s) => s.isPlaying);
  const setCurrentTime = useVideoPlaybackStore((s) => s.setCurrentTime);
  const togglePlay = useVideoPlaybackStore((s) => s.togglePlay);

  // Defer state updates to prevent Chrome from dropping pointermove events
  const handleTogglePlay = useCallback(() => {
    setTimeout(() => togglePlay(), 0);
  }, [togglePlay]);

  const handleScrub = useCallback(([value]: number[]) => {
    setTimeout(() => setCurrentTime(value), 0);
  }, [setCurrentTime]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      useVideoPlaybackStore.setState((state) => {
        const next = state.currentTime + 1;
        if (next >= state.duration) {
          return { currentTime: state.duration, isPlaying: false };
        }
        return { currentTime: next };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <Flex align="center" gap="2" className={styles.scrubber}>
      <IconButton variant="ghost" size="1" onClick={handleTogglePlay}>
        {isPlaying ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <rect x="2" y="1" width="3.5" height="12" rx="0.5" />
            <rect x="8.5" y="1" width="3.5" height="12" rx="0.5" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <polygon points="3,1 12,7 3,13" />
          </svg>
        )}
      </IconButton>
      <Slider
        value={[currentTime]}
        onValueChange={handleScrub}
        min={0}
        max={duration}
        step={1}
        size="1"
        className={styles.slider}
      />
      <Text size="1" className={styles.time}>
        {formatTime(currentTime)}&nbsp;/&nbsp;{formatTime(duration)}
      </Text>
    </Flex>
  );
}
