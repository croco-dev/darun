type LogoProps = {
  size?: number;
};

export function Logo({ size = 32 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="64" height="64" rx="16" fill="#111827" />
      <path d="M18 19H32C42.4934 19 51 27.5066 51 38C51 48.4934 42.4934 57 32 57H18V19Z" fill="#F9FAFB" />
      <path d="M27 28H32C37.5228 28 42 32.4772 42 38C42 43.5228 37.5228 48 32 48H27V28Z" fill="#111827" />
    </svg>
  );
}
