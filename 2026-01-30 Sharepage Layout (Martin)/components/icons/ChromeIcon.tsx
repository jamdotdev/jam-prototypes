import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
}

export function ChromeIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="7" cy="7" r="6.5" fill="#fff" stroke="#ddd" strokeWidth="1" />
      <circle cx="7" cy="7" r="2.5" fill="#4285F4" />
      <path d="M7 4.5L11.5 4.5A6 6 0 0 0 4 2L7 7V4.5Z" fill="#EA4335" />
      <path d="M4 2L7 7L4.75 11.5A6 6 0 0 1 4 2Z" fill="#FBBC05" />
      <path d="M4.75 11.5L7 7H13A6 6 0 0 1 4.75 11.5Z" fill="#34A853" />
    </svg>
  );
}
