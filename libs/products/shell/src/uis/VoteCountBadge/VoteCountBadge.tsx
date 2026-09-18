import { Heart } from '@darun/ui';
import { useLocale } from 'next-intl';
import type { FC } from 'react';

type VoteCountBadgeProps = {
  count: number;
  className?: string;
};

export const VoteCountBadge: FC<VoteCountBadgeProps> = ({ count, className = '' }) => {
  const locale = useLocale();

  const label = locale === 'en' ? `${count} upvotes` : `추천 ${count}`;

  return (
    <div
      role="status"
      aria-label={label}
      title={label}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border border-cherry-200/80 bg-gradient-to-r from-cherry-50/90 to-cherry-50/50 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-cherry-900 shadow-2xs transition-all duration-200 ease-out group-hover:border-cherry-300 group-hover:shadow-xs group-hover:scale-105 active:scale-95 motion-reduce:transition-none motion-reduce:transform-none ${className}`}
    >
      <Heart
        size={13}
        className="text-cherry-500 fill-cherry-500/40 transition-transform duration-200 ease-out group-hover:scale-110 motion-reduce:transform-none"
        aria-hidden="true"
      />
      <span>{count}</span>
    </div>
  );
};
