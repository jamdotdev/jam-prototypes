'use client';

import { useState, useRef } from 'react';
import { Flex, IconButton } from '@radix-ui/themes';
import { useAutoResizeTextarea } from '@/hooks/useAutoResizeTextarea';
import { AttachmentIcon } from '@/components/icons/AttachmentIcon';
import { SendIcon } from '@/components/icons/SendIcon';
import styles from './CommentInput.module.css';

interface CommentInputProps {
  placeholder?: string;
  onSubmit: (text: string, attachments?: File[]) => void;
  disabled?: boolean;
}

export function CommentInput({
  placeholder = 'Write a comment...',
  onSubmit,
  disabled = false,
}: CommentInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea using shared hook
  useAutoResizeTextarea(textareaRef, value);

  const handleSubmit = () => {
    if (value.trim()) {
      onSubmit(value.trim());
      setValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Cmd/Ctrl + Enter to submit
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={styles.commentInputWrapper}>
      <Flex direction="column" gap="2" className={styles.inputContainer}>
        <textarea
          ref={textareaRef}
          className={styles.inputField}
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
        />

        <Flex gap="2" align="center" justify="end" className={styles.actions}>
          <IconButton
            variant="ghost"
            size="2"
            color="gray"
            disabled={disabled}
            aria-label="Attach file"
          >
            <AttachmentIcon />
          </IconButton>

          <IconButton
            variant="solid"
            size="2"
            onClick={handleSubmit}
            disabled={disabled || !value.trim()}
            aria-label="Send comment"
          >
            <SendIcon />
          </IconButton>
        </Flex>
      </Flex>
    </div>
  );
}
