import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

export function AppleIcon({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M10.5 11.667C9.917 12.333 9.333 12.917 8.417 12.917C7.5 12.917 7.167 12.333 6.083 12.333C5 12.333 4.583 12.917 3.75 12.917C2.833 12.917 2.167 12.25 1.583 11.583C0.417 10.167 -0.5 7.75 0.75 6.083C1.417 5.083 2.5 4.5 3.667 4.5C4.667 4.5 5.333 5.083 6.167 5.083C6.917 5.083 7.5 4.5 8.667 4.5C9.667 4.5 10.667 5 11.333 5.917C9.833 6.75 10.083 9 11.667 9.583C11.333 10.333 10.917 11.083 10.5 11.667ZM7 4.333C6.917 3.417 7.333 2.5 7.833 1.917C8.417 1.25 9.333 0.75 10.083 0.75C10.167 1.75 9.75 2.667 9.25 3.25C8.75 3.917 7.833 4.417 7 4.333Z"
        fill={color}
      />
    </svg>
  );
}
