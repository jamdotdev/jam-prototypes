'use client';

import React from 'react';
import { Flex } from '@radix-ui/themes';
import { Button, IconButton } from '@/components/ui';
import { ShareIcon } from '../icons';
import styles from './ShareSplitButton.module.css';

interface ShareSplitButtonProps {
  onCopyLink?: () => void;
  onShare?: () => void;
}

export function ShareSplitButton({ onCopyLink, onShare }: ShareSplitButtonProps) {
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    onCopyLink?.();
  };

  return (
    <Flex align="stretch">
      <Button
        variant="solid"
        size="2"
        className={styles.copyButton}
        onClick={handleCopyLink}
      >
        Copy link
      </Button>
      <div className={styles.separator} />
      <IconButton
        variant="solid"
        size="2"
        className={styles.shareButton}
        onClick={onShare}
      >
        <ShareIcon size={16} />
      </IconButton>
    </Flex>
  );
}
