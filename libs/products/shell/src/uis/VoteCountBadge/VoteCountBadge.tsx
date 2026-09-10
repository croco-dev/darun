import { Heart } from '@darun/ui';
import type { FC } from 'react';

type VoteCountBadgeProps = {
  count: number;
  className?: string;
};

export const VoteCountBadge: FC<VoteCountBadgeProps> = ({ count, className = '' }) => (
  <div
    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border border-cherry-200/70 bg-cherry-50/60 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-cherry-900 shadow-2xs transition-all duration-200 ease-out group-hover:border-cherry-300 group-hover:bg-cherry-50 group-hover:shadow-xs motion-reduce:transition-none ${className}`}
  >
    <Heart
      size={13}
      className="text-cherry-500 fill-cherry-500/40 transition-transform duration-200 ease-out group-hover:scale-110 motion-reduce:transform-none"
      aria-hidden="true"
    />
    <span>{count}</span>
  </div>
);
