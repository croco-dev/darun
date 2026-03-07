type LogoProps = { size: number };

export function Logo({ size }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10 0C2.61744 0 0 2.61744 0 10C0 17.3836 2.61744 20 10 20C17.3826 20 20 17.3836 20 10C20 2.61744 17.3826 0 10 0Z"
        fill="#111111"
      />
      <path
        d="M11.4857 5L12.8 5.53414L12 7.29209H15V8.64435H11.3929L10.1643 11.3489H15V12.7011H9.55714L8.51429 15L7.2 14.4659L8 12.7011H5V11.3489H8.61429L9.83571 8.64435H5V7.29209H10.45L11.4857 5Z"
        fill="#fff"
      />
    </svg>
  );
}
