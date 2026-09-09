import type { FC } from 'react';

type VoteCountBadgeProps = {
  count: number;
  className?: string;
};

export const VoteCountBadge: FC<VoteCountBadgeProps> = ({ count, className = '' }) => (
  <div
    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border border-cherry-200/70 bg-cherry-50/60 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-cherry-900 shadow-2xs transition-all duration-200 ease-out group-hover:border-cherry-300 group-hover:bg-cherry-50 group-hover:shadow-xs motion-reduce:transition-none ${className}`}
  >
    <svg
      className="h-3.5 w-3.5 text-cherry-500 fill-cherry-500/40 transition-transform duration-200 ease-out group-hover:scale-110 motion-reduce:transform-none"
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
    <span>{count}</span>
  </div>
);
