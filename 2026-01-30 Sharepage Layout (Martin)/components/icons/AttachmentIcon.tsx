import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

export function AttachmentIcon({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M21.1525 10.8995L12.1369 19.9151C10.0866 21.9654 6.7625 21.9654 4.71225 19.9151C2.66194 17.8648 2.66194 14.5407 4.71225 12.4905L13.7279 3.47487C15.0947 2.10804 17.3108 2.10804 18.6776 3.47487C20.0444 4.8417 20.0444 7.05774 18.6776 8.42457L10.0156 17.0866C9.33213 17.7701 8.22411 17.7701 7.5407 17.0866C6.85728 16.4032 6.85728 15.2952 7.5407 14.6118L15.1421 7.01037"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
