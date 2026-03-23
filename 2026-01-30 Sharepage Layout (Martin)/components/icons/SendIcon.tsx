import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

export function SendIcon({ size = 16, color = 'currentColor', className }: IconProps) {
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
        d="M10.5004 12H5.00043M4.91577 12.2915L2.58085 19.266C2.39742 19.8139 2.3057 20.0879 2.37152 20.2566C2.42868 20.4031 2.55144 20.5142 2.70292 20.5565C2.87736 20.6052 3.14083 20.4866 3.66776 20.2495L20.3792 12.7296C20.8936 12.4981 21.1507 12.3824 21.2302 12.2216C21.2993 12.0816 21.2993 11.9184 21.2302 11.7784C21.1507 11.6176 20.8936 11.5019 20.3792 11.2704L3.66193 3.74841C3.13659 3.51195 2.87392 3.39372 2.69966 3.44223C2.54832 3.48429 2.42556 3.59505 2.36821 3.74125C2.30216 3.90966 2.39299 4.18323 2.57465 4.73038L4.91642 11.7853C4.94759 11.8792 4.96317 11.9262 4.96933 11.9742C4.97479 12.0168 4.97473 12.0599 4.96916 12.1025C4.96289 12.1506 4.94718 12.1975 4.91577 12.2915Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
