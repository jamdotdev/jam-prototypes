import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

export function FaceHappyIcon({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle
        cx="8"
        cy="8"
        r="6"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 9.5C5.5 9.5 6.25 11 8 11C9.75 11 10.5 9.5 10.5 9.5"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="6" cy="6.5" r="0.75" fill={color} />
      <circle cx="10" cy="6.5" r="0.75" fill={color} />
    </svg>
  );
}
