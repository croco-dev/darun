'use client';

const Skeleton = ({ className = '' }: { className?: string }) => (
  <div
    aria-hidden="true"
    className={`${className} animate-pulse bg-gradient-to-r from-surface-100 via-surface-200 to-surface-100 motion-reduce:animate-none`}
  />
);

export const SearchProductListSkeleton = () => {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 lg:gap-5">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={String(i)}
          className="relative flex h-full flex-col justify-between rounded-card-lg border border-dark-150 bg-white p-4 shadow-card sm:p-5"
        >
          <div className="flex flex-col gap-3">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div className="flex flex-col gap-1">
              <Skeleton className="h-5 w-3/4 rounded" />
              <Skeleton className="h-4 w-full rounded" />
            </div>
            <div className="flex items-center justify-between gap-2 pt-1">
              <Skeleton className="h-5 w-16 rounded-md" />
              <Skeleton className="h-6 w-12 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
