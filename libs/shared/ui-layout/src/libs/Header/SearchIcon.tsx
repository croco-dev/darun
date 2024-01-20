type IconProps = {
  size: number;
};

export const SearchIcon = ({ size }: IconProps) => {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M16.0555 14.8145L12.7477 11.5066C13.544 10.4465 13.9739 9.15598 13.9725 7.83C13.9725 4.44305 11.217 1.6875 7.83 1.6875C4.44305 1.6875 1.6875 4.44305 1.6875 7.83C1.6875 11.217 4.44305 13.9725 7.83 13.9725C9.15598 13.9739 10.4465 13.544 11.5066 12.7477L14.8145 16.0555C14.9819 16.2052 15.2003 16.2851 15.4248 16.2788C15.6493 16.2725 15.8629 16.1805 16.0217 16.0217C16.1805 15.8629 16.2725 15.6493 16.2788 15.4248C16.2851 15.2003 16.2052 14.9819 16.0555 14.8145ZM3.4425 7.83C3.4425 6.96223 3.69982 6.11396 4.18193 5.39244C4.66403 4.67092 5.34927 4.10856 6.15098 3.77648C6.95269 3.4444 7.83487 3.35751 8.68596 3.5268C9.53705 3.6961 10.3188 4.11397 10.9324 4.72757C11.546 5.34117 11.9639 6.12295 12.1332 6.97404C12.3025 7.82513 12.2156 8.70731 11.8835 9.50902C11.5514 10.3107 10.9891 10.996 10.2676 11.4781C9.54604 11.9602 8.69777 12.2175 7.83 12.2175C6.66679 12.2161 5.55162 11.7534 4.72911 10.9309C3.9066 10.1084 3.4439 8.99321 3.4425 7.83Z"
        fill="#555555"
      />
    </svg>
  );
};
