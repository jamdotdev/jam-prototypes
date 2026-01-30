import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

export function DotsHorizontalIcon({ size = 16, color = 'currentColor', className }: IconProps) {
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
        d="M7.99984 8.66732C8.36803 8.66732 8.6665 8.36884 8.6665 8.00065C8.6665 7.63246 8.36803 7.33398 7.99984 7.33398C7.63165 7.33398 7.33317 7.63246 7.33317 8.00065C7.33317 8.36884 7.63165 8.66732 7.99984 8.66732Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.6665 8.66732C13.0347 8.66732 13.3332 8.36884 13.3332 8.00065C13.3332 7.63246 13.0347 7.33398 12.6665 7.33398C12.2983 7.33398 11.9998 7.63246 11.9998 8.00065C11.9998 8.36884 12.2983 8.66732 12.6665 8.66732Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.33317 8.66732C3.70136 8.66732 3.99984 8.36884 3.99984 8.00065C3.99984 7.63246 3.70136 7.33398 3.33317 7.33398C2.96498 7.33398 2.6665 7.63246 2.6665 8.00065C2.6665 8.36884 2.96498 8.66732 3.33317 8.66732Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
