import type { FC } from "react";

type VoteCountBadgeProps = {
  count: number;
  className?: string;
};

export const VoteCountBadge: FC<VoteCountBadgeProps> = ({
  count,
  className = "",
}) => (
  <div
    className={`inline-flex shrink-0 items-center gap-1 rounded-full border border-dark-150 bg-surface-100 px-2.5 py-0.5 text-2xs font-semibold tabular-nums text-dark-700 transition-colors duration-200 group-hover:border-dark-200 group-hover:bg-white group-hover:text-dark-900 ${className}`}
  >
    <svg
      className="h-3 w-3 text-dark-400 transition-colors duration-200 group-hover:text-dark-600"
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
    <span>{count}</span>
  </div>
);
