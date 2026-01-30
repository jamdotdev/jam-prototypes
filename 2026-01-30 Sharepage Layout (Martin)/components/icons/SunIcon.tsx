import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

export function SunIcon({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="8" cy="8" r="3" stroke={color} strokeWidth="1.5" />
      <path
        d="M8 1.5V3M8 13V14.5M1.5 8H3M13 8H14.5M3.05 3.05L4.11 4.11M11.89 11.89L12.95 12.95M3.05 12.95L4.11 11.89M11.89 4.11L12.95 3.05"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
