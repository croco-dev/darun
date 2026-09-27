import { Heart } from '@darun/ui';
import { useLocale } from 'next-intl';
import type { FC } from 'react';

type VoteCountBadgeProps = {
  count: number;
  className?: string;
};

export const VoteCountBadge: FC<VoteCountBadgeProps> = ({ count, className = '' }) => {
  const locale = useLocale();

  const formattedCount = count.toLocaleString(locale);
  const label = locale === 'en' ? `${formattedCount} ${count === 1 ? 'upvote' : 'upvotes'}` : `추천 ${formattedCount}`;

  return (
    <div
      role="text"
      aria-label={label}
      title={label}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border border-dark-150/90 bg-surface-100/80 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-dark-800 shadow-2xs transition-colors duration-150 group-hover:border-dark-300 group-hover:bg-white group-hover:text-dark-950 ${className}`}
    >
      <Heart
        size={12}
        className="shrink-0 text-dark-400 fill-dark-400/30 transition-colors duration-150 group-hover:text-dark-700 group-hover:fill-dark-700/40"
        aria-hidden="true"
      />
      <span>{formattedCount}</span>
    </div>
  );
};
