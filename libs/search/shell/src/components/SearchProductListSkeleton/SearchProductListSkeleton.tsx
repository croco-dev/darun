'use client';

export const SearchProductListSkeleton = () => {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 lg:gap-5">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={String(i)}
          className="relative flex h-full flex-col justify-between rounded-card-lg border border-dark-150 bg-white p-4 shadow-card sm:p-5"
        >
          <div className="flex flex-col gap-3">
            <div className="h-12 w-12 animate-pulse rounded-xl bg-dark-100 motion-reduce:animate-none" />
            <div className="flex flex-col gap-1">
              <div className="h-5 w-3/4 animate-pulse rounded bg-dark-100 motion-reduce:animate-none" />
              <div className="h-4 w-full animate-pulse rounded bg-dark-100 motion-reduce:animate-none" />
            </div>
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="h-5 w-16 animate-pulse rounded-md bg-dark-100 motion-reduce:animate-none" />
              <div className="h-6 w-12 animate-pulse rounded-lg bg-dark-100 motion-reduce:animate-none" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
