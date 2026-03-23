'use client';

interface IconProps {
  size?: number;
  className?: string;
}

export function LinearIcon({ size = 16, className }: IconProps) {
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
        d="M0 4.5C0 2.01472 2.01472 0 4.5 0H11.5C13.9853 0 16 2.01472 16 4.5V11.5C16 13.9853 13.9853 16 11.5 16H4.5C2.01472 16 0 13.9853 0 11.5V4.5Z"
        fill="#202020"
      />
      <g clipPath="url(#clip0_linear)">
        <path
          d="M11.6734 12.2689C11.7769 12.1794 11.8779 12.0855 11.9762 11.9873C14.1751 9.78833 14.1751 6.22315 11.9762 4.02421C9.77723 1.82526 6.21205 1.82526 4.01311 4.02421C3.91483 4.12249 3.82094 4.22349 3.73145 4.32698L11.6734 12.2689Z"
          fill="white"
        />
        <path
          d="M11.0022 12.7675L3.23276 4.99805C3.07693 5.2442 2.94206 5.4998 2.82812 5.7623L10.2379 13.1721C10.5004 13.0582 10.756 12.9233 11.0022 12.7675Z"
          fill="white"
        />
        <path
          d="M9.36537 13.4679L2.53218 6.63477C2.44902 6.9674 2.39663 7.30614 2.375 7.64648L8.35366 13.6251C8.69399 13.6035 9.03274 13.5511 9.36537 13.4679Z"
          fill="white"
        />
        <path
          d="M7.12951 13.5699L2.42969 8.87012C2.60601 10.0111 3.13362 11.1082 4.01252 11.9871C4.89141 12.866 5.98857 13.3936 7.12951 13.5699Z"
          fill="white"
        />
      </g>
      <defs>
        <clipPath id="clip0_linear">
          <rect width="12" height="12" fill="white" transform="translate(2 2)" />
        </clipPath>
      </defs>
    </svg>
  );
}
