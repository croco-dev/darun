import { useLocale } from 'next-intl';

type RankBadgeProps = {
  rank: number;
  size?: 'sm' | 'md';
};

const sizeStyles = {
  sm: 'h-6 min-w-6 px-2 text-xs rounded-lg',
  md: 'h-9 min-w-9 px-2 shrink-0 text-sm rounded-xl',
} as const;

export const RankBadge = ({ rank, size = 'sm' }: RankBadgeProps) => {
  const locale = useLocale();
  return (
    <span
      role="text"
      aria-label={locale === 'en' ? `Rank ${rank}` : `${rank}위`}
      className={`flex items-center justify-center font-black tracking-tight tabular-nums transition-all duration-200 ease-out motion-reduce:transition-none ${sizeStyles[size]} ${
        rank === 1
          ? 'border border-dark-900 bg-dark-900 text-white shadow-2xs'
          : rank === 2
            ? 'border border-dark-200 bg-surface-200 font-bold text-dark-900 shadow-2xs'
            : rank === 3
              ? 'border border-dark-150 bg-surface-100 font-bold text-dark-800 shadow-2xs'
              : 'border border-dark-150/80 bg-white font-semibold text-dark-500 shadow-2xs group-hover:border-dark-300 group-hover:text-dark-900'
      }`}
    >
      {rank}
    </span>
  );
};
