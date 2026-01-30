'use client';

import React from 'react';
import Image from 'next/image';
import { Flex } from '@radix-ui/themes';
import { Button, IconButton } from '@/components/ui';
import { HomeSmileIcon, GridIcon, DotsHorizontalIcon, CodeIcon } from '../icons';
import { ShareSplitButton } from '../ShareSplitButton/ShareSplitButton';
import styles from './MainHeader.module.css';

interface MainHeaderProps {
  showDevToolsToggle: boolean;
  isUndocked?: boolean;
  onOpenDevTools?: () => void;
  onFocusDevTools?: () => void;
}

export function MainHeader({
  showDevToolsToggle,
  isUndocked = false,
  onOpenDevTools,
  onFocusDevTools,
}: MainHeaderProps) {
  return (
    <header className={styles.header}>
      <Flex align="center" gap="3">
        {/* Home button */}
        <IconButton variant="outline" size="2" color="gray">
          <HomeSmileIcon />
        </IconButton>

        {/* Breadcrumb */}
        <Flex align="center" gap="1">
          {/* Workspace Avatar */}
          <button className={styles.avatarButton}>
            <Image
              src="/images/workspace-avatar.png"
              alt="Workspace"
              width={16}
              height={16}
              className={styles.avatar}
            />
          </button>

          <span className={styles.separator}>/</span>

          <Flex align="center" gap="1">
            <Button variant="ghost" size="1" color="gray" className={styles.folderButton}>
              <GridIcon />
              All Jams
            </Button>

            <IconButton variant="ghost" size="1" color="gray">
              <DotsHorizontalIcon />
            </IconButton>
          </Flex>
        </Flex>
      </Flex>

      <Flex align="center" gap="1">
        <ShareSplitButton />

        {showDevToolsToggle && (
          <Button
            variant="ghost"
            color="gray"
            size="2"
            onClick={isUndocked ? onFocusDevTools : onOpenDevTools}
          >
            <CodeIcon />
            Show Devtools
          </Button>
        )}
      </Flex>
    </header>
  );
}
