import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

export function UndockIcon({ size = 16, color = 'currentColor', className }: IconProps) {
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
        d="M11 14H6.26667C4.77319 14 4.02646 14 3.45603 13.7094C2.95426 13.4537 2.54631 13.0457 2.29065 12.544C2 11.9735 2 11.2268 2 9.73333V5M11.8667 2H6.46667C5.71993 2 5.34656 2 5.06135 2.14532C4.81046 2.27316 4.60649 2.47713 4.47866 2.72801C4.33333 3.01323 4.33333 3.3866 4.33333 4.13333V9.53333C4.33333 10.2801 4.33333 10.6534 4.47866 10.9387C4.60649 11.1895 4.81046 11.3935 5.06135 11.5213C5.34656 11.6667 5.71993 11.6667 6.46667 11.6667H11.8667C12.6134 11.6667 12.9868 11.6667 13.272 11.5213C13.5229 11.3935 13.7268 11.1895 13.8547 10.9387C14 10.6534 14 10.2801 14 9.53333V4.13333C14 3.3866 14 3.01323 13.8547 2.72801C13.7268 2.47713 13.5229 2.27316 13.272 2.14532C12.9868 2 12.6134 2 11.8667 2Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
