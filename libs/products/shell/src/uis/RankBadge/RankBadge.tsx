import { getLocale } from 'next-intl/server';

type RankBadgeProps = {
  rank: number;
  size?: 'sm' | 'md';
};

const sizeStyles = {
  sm: 'h-6 min-w-6 px-2 text-xs rounded-lg',
  md: 'h-9 w-9 shrink-0 text-sm rounded-xl',
} as const;

export const RankBadge = async ({ rank, size = 'sm' }: RankBadgeProps) => {
  const locale = await getLocale();
  return (
    <span
      aria-label={locale === 'en' ? `Rank ${rank}` : `${rank}위`}
      className={`flex items-center justify-center font-black tabular-nums transition-colors duration-200 ease-out motion-reduce:transition-none ${sizeStyles[size]} ${
        rank === 1
          ? 'bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 text-amber-950 shadow-xs ring-1 ring-amber-300/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.7)]'
          : rank === 2
            ? 'bg-gradient-to-b from-slate-100 via-slate-200 to-slate-300 text-slate-800 shadow-xs ring-1 ring-slate-300/90 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9)]'
            : rank === 3
              ? 'bg-gradient-to-b from-amber-600 via-amber-700 to-orange-800 text-amber-50 shadow-xs ring-1 ring-amber-600/50 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35)]'
              : 'border border-dark-150 bg-surface-100 font-bold text-dark-600 group-hover:border-dark-300 group-hover:bg-white group-hover:text-dark-900'
      }`}
    >
      {rank}
    </span>
  );
};