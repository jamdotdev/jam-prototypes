import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

export function MoonIcon({ size = 16, color = 'currentColor', className }: IconProps) {
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
        d="M14 8.83A6 6 0 1 1 7.17 2 4.67 4.67 0 0 0 14 8.83Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
