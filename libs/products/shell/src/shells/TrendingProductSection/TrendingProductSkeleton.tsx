export const TrendingProductSkeleton = () => {
  return (
    <div data-testid="skel-trending" className="flex flex-col gap-6">
      <div className="flex h-7 w-48 animate-pulse rounded-lg bg-dark-100" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={String(i)}
            className="relative flex h-full flex-col rounded-card border border-surface-300 bg-white p-3.5 shadow-card motion-reduce:animate-none md:rounded-card md:p-4"
          >
            <span className="left-3.5 top-3.5 inline-flex h-8 min-w-8 animate-pulse motion-reduce:animate-none rounded-full bg-dark-100 md:left-4 md:top-4 md:h-9 md:min-w-9" />
            <div className="flex flex-col gap-3 pt-10 md:pt-12">
              <div className="h-5 w-3/4 animate-pulse motion-reduce:animate-none rounded bg-dark-100" />
              <div className="h-4 w-full animate-pulse motion-reduce:animate-none rounded bg-dark-100" />
              <div className="flex gap-2">
                <div className="h-5 w-16 animate-pulse rounded-full bg-dark-100" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
