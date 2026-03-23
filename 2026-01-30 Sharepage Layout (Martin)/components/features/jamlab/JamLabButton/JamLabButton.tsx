'use client';

import { forwardRef } from 'react';
import { BeakerIcon } from '@/components/icons/BeakerIcon';
import { XCloseIcon } from '@/components/icons/XCloseIcon';
import styles from './JamLabButton.module.css';

interface JamLabButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isOpen?: boolean;
}

export const JamLabButton = forwardRef<HTMLButtonElement, JamLabButtonProps>(
  ({ isOpen, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={styles.fab}
        aria-label={isOpen ? 'Close Jam Lab' : 'Open Jam Lab'}
        {...props}
      >
        {isOpen ? <XCloseIcon size={20} /> : <BeakerIcon size={20} />}
      </button>
    );
  }
);

JamLabButton.displayName = 'JamLabButton';
