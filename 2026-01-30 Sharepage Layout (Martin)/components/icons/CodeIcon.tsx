import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

export function CodeIcon({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M11.3333 11.3333L14.6667 8L11.3333 4.66667M4.66667 4.66667L1.33333 8L4.66667 11.3333M9.33333 2L6.66667 14"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
