'use client';

import { useState, useRef, useEffect } from 'react';
import { Avatar, Flex, Text, Box, IconButton, Button, DropdownMenu } from '@radix-ui/themes';
import type { Comment } from '@/types/comment.types';
import type { User } from '@/types/user.types';
import { useAutoResizeTextarea } from '@/hooks/useAutoResizeTextarea';
import { Timestamp } from '@/components/ui/Timestamp/Timestamp';
import { TimeBadge } from '@/components/ui/TimeBadge/TimeBadge';
import { FaceHappyIcon } from '@/components/icons/FaceHappyIcon';
import { DotsHorizontalIcon } from '@/components/icons/DotsHorizontalIcon';
import { PencilIcon } from '@/components/icons/PencilIcon';
import { TrashIcon } from '@/components/icons/TrashIcon';
import { AttachmentIcon } from '@/components/icons/AttachmentIcon';
import styles from './CommentItem.module.css';

interface CommentItemProps {
  comment: Comment;
  user: User | undefined;
  isEditable?: boolean;
  onEdit?: (id: string, newText: string) => void;
  onDelete?: (id: string) => void;
}

export function CommentItem({
  comment,
  user,
  isEditable = true,
  onEdit,
  onDelete,
}: CommentItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const userName = user?.name ?? 'Unknown';

  // Auto-resize textarea using shared hook
  useAutoResizeTextarea(textareaRef, editText, isEditing);

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(editText.length, editText.length);
    }
  }, [isEditing]);

  const handleSave = () => {
    onEdit?.(comment.id, editText);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditText(comment.text);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSave();
    }
  };

  return (
    <Flex
      direction="column"
      gap="2"
      className={`${styles.commentItem} ${isEditing ? styles.commentItemEditing : ''}`}
      onMouseEnter={() => !isEditing && setIsHovered(true)}
      onMouseLeave={() => !isEditing && setIsHovered(false)}
    >
      {/* Header */}
      <Flex align="center" justify="between" className={styles.header}>
        <Flex gap="1" align="center">
          <Flex
            align="center"
            justify="center"
            className={styles.avatarWrapper}
          >
            <Avatar
              src={user?.avatar}
              fallback={userName.charAt(0).toUpperCase()}
              size="2"
              radius="full"
            />
          </Flex>

          <Flex gap="1" align="center" className={styles.metadata}>
            <Text size="2" weight="medium">
              {userName}
            </Text>
            {comment.videoTime !== null && <TimeBadge seconds={comment.videoTime} />}
            <Text size="2" color="gray">
              ·
            </Text>
            <Timestamp date={comment.timestamp} />
          </Flex>
        </Flex>

        {/* Trailing - action buttons on hover (not in edit mode) */}
        {!isEditing && (
          <Flex align="center" className={styles.trailing}>
            {isHovered && isEditable && (
              <Flex gap="3" align="center" className={styles.trailingActions}>
                <IconButton variant="ghost" size="1" color="gray">
                  <FaceHappyIcon />
                </IconButton>
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger>
                    <IconButton variant="ghost" size="1" color="gray">
                      <DotsHorizontalIcon />
                    </IconButton>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content>
                    <DropdownMenu.Item onClick={() => setIsEditing(true)}>
                      <PencilIcon /> Edit
                    </DropdownMenu.Item>
                    <DropdownMenu.Item color="red" onClick={() => onDelete?.(comment.id)}>
                      <TrashIcon /> Delete
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              </Flex>
            )}
          </Flex>
        )}

        {/* Empty trailing placeholder in edit mode */}
        {isEditing && <Box className={styles.trailing} />}
      </Flex>

      {/* Comment Content */}
      <Box className={`${styles.commentWrapper} ${isEditing ? styles.commentWrapperEditing : ''}`}>
        {isEditing ? (
          <textarea
            ref={textareaRef}
            className={styles.editTextarea}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
        ) : (
          <Text size="3" className={styles.commentText}>
            {comment.text}
          </Text>
        )}
      </Box>

      {/* Footer - only in edit mode */}
      {isEditing && (
        <Flex justify="between" align="center" className={styles.footer}>
          <IconButton variant="ghost" size="1" color="gray">
            <AttachmentIcon />
          </IconButton>
          <Flex gap="2" align="center">
            <Button variant="ghost" size="2" color="gray" onClick={handleCancel}>
              Cancel
            </Button>
            <Button variant="outline" size="2" color="gray" onClick={handleSave}>
              Save
            </Button>
          </Flex>
        </Flex>
      )}
    </Flex>
  );
}
