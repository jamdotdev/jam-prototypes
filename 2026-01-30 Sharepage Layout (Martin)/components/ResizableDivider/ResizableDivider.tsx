'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { MIN_MAIN_PANEL, MAX_MAIN_PANEL } from '@/hooks/useDevToolsState';
import styles from './ResizableDivider.module.css';

interface ResizableDividerProps {
  onResize: (ratio: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

export function ResizableDivider({
  onResize,
  onDragStart,
  onDragEnd,
}: ResizableDividerProps) {
  const dividerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingRef.current) return;

      const container = dividerRef.current?.parentElement;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const mouseX = e.clientX - containerRect.left;

      // Calculate ratio as percentage of main panel width
      const ratio = (mouseX / containerWidth) * 100;

      // Constrain to min/max panel widths
      const constrainedRatio = Math.max(MIN_MAIN_PANEL, Math.min(MAX_MAIN_PANEL, ratio));

      onResize(constrainedRatio);
    },
    [onResize]
  );

  const handleMouseUp = useCallback(() => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      onDragEnd();
    }
  }, [onDragEnd]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDraggingRef.current = true;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      onDragStart();
    },
    [onDragStart]
  );

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={dividerRef}
      className={styles.divider}
      onMouseDown={handleMouseDown}
    >
      <div className={styles.handle} />
    </div>
  );
}
