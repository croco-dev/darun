'use client';

export const SearchProductListSkeleton = () => {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3 xl:gap-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={String(i)} className="rounded-card border border-dark-150 bg-white p-4 shadow-card md:p-5">
          <div className="flex flex-col gap-3 md:gap-4">
            <div className="h-14 w-14 animate-pulse rounded-xl bg-dark-100 motion-reduce:animate-none" />
            <div className="flex flex-col gap-0.5">
              <div className="h-5 w-1/3 animate-pulse rounded bg-dark-100 motion-reduce:animate-none" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-dark-100 motion-reduce:animate-none" />
            </div>
            <div className="h-5 w-20 animate-pulse rounded-chip bg-dark-100 motion-reduce:animate-none" />
          </div>
        </div>
      ))}
    </div>
  );
};
