interface BeakerIconProps {
  size?: number;
  className?: string;
}

export function BeakerIcon({ size = 16, className }: BeakerIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      className={className}
    >
      <path
        d="M6 2V6.5L3.5 11C2.83333 12.1667 3.1 14 5.5 14H10.5C12.9 14 13.1667 12.1667 12.5 11L10 6.5V2M5 2H11M7 6H9M5 11H11"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
