type LogoProps = {
  size: number;
  colorType?: 'light' | 'dark';
};

const dark = '#111111';

export function Logo({ size, colorType = 'dark' }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M18 0C4.71138 0 0 4.71138 0 18C0 31.2905 4.71138 36 18 36C31.2886 36 36 31.2905 36 18C36 4.71138 31.2886 0 18 0Z"
        fill={colorType === 'dark' ? dark : '#fff'}
      />
      <path
        d="M20.6743 9L23.04 9.96146L21.6 13.1258H27V15.5598H20.5071L18.2957 20.428H27V22.8621H17.2029L15.3257 27L12.96 26.0385L14.4 22.8621H9V20.428H15.5057L17.7043 15.5598H9V13.1258H18.81L20.6743 9Z"
        fill={colorType === 'dark' ? '#fff' : dark}
      />
    </svg>
  );
}
