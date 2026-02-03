'use client';

import { Flex, Text, Box, IconButton, Tooltip, Theme } from '@radix-ui/themes';
import { SharePageLayout } from '@/components/layout/SharePageLayout/SharePageLayout';
import { ActivityPanel, CommentInput } from '@/components/features/activity';
import { DevToolsContent } from '@/components/features/devtools';
import { TheaterModeIcon } from '@/components/icons/TheaterModeIcon';
import { useSettings } from '@/stores/settingsStore';
import { useDevToolsStore } from '@/stores/devToolsStore';
import { useGeneratedData } from '@/data/useGeneratedData';
import { JamLab } from '@/components/features/jamlab';
import styles from './page.module.css';

function MainContent() {
  const settings = useSettings();
  const { jam, activities, comments, getUserById } = useGeneratedData(settings);
  const isTheaterMode = useDevToolsStore((s) => s.isTheaterMode);
  const toggleTheaterMode = useDevToolsStore((s) => s.toggleTheaterMode);

  const handleCommentSubmit = (text: string) => {
    console.log('Comment submitted:', text);
  };

  const handleEditComment = (id: string, newText: string) => {
    console.log('Comment edited:', id, newText);
  };

  const handleDeleteComment = (id: string) => {
    console.log('Comment deleted:', id);
  };

  return (
    <Flex direction="column" className={styles.mainContent}>
      {/* Video Player */}
      <Box className={`${styles.videoWrapper} ${isTheaterMode ? styles.videoWrapperTheater : ''}`}>
        <Box className={`${styles.videoPlayer} ${isTheaterMode ? styles.videoPlayerTheater : ''}`}>
          <Flex
            direction="column"
            align="center"
            gap="2"
            style={{ color: 'var(--color-gray-6)' }}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            <Text size="2">Video Player</Text>
          </Flex>

          {/* Theater Mode Toggle - forced dark mode for visibility on video */}
          <Theme appearance="dark" hasBackground={false} asChild>
            <div className={styles.videoControls}>
              <Tooltip content={isTheaterMode ? 'Exit theater mode' : 'Theater mode'}>
                <IconButton
                  variant="ghost"
                  size="1"
                  onClick={toggleTheaterMode}
                >
                  <TheaterModeIcon />
                </IconButton>
              </Tooltip>
            </div>
          </Theme>
        </Box>
      </Box>

      {/* Title & Description */}
      <Flex direction="column" gap="2" className={styles.titleSection}>
        <Text size="5" weight="bold">
          {jam.title}
        </Text>
        {jam.description && (
          <Text size="3">
            {jam.description}
          </Text>
        )}
      </Flex>

      {/* Activity Panel */}
      <div className={styles.activitySection}>
        <ActivityPanel
          activities={activities}
          comments={comments}
          getUserById={getUserById}
          onEditComment={handleEditComment}
          onDeleteComment={handleDeleteComment}
        />
      </div>

      {/* Floating Comment Input */}
      <CommentInput onSubmit={handleCommentSubmit} />
    </Flex>
  );
}

export default function Home() {
  return (
    <>
      <SharePageLayout devToolsContent={<DevToolsContent />}>
        <MainContent />
      </SharePageLayout>
      <JamLab />
    </>
  );
}
