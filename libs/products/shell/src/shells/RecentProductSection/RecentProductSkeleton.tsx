export const RecentProductSkeleton = () => {
  return (
    <div data-testid="skel-recent" className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex h-7 w-48 animate-pulse rounded-lg bg-dark-100" />
        <div className="h-4 w-64 animate-pulse rounded bg-dark-100" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={String(i)}
            className="relative flex h-full flex-col rounded-[20px] border border-surface-300 bg-white p-3.5 shadow-[0px_12px_28px_-24px_rgba(15,23,42,0.18)] md:rounded-[24px] md:p-4"
          >
            <div className="flex flex-col gap-3">
              <div className="h-5 w-3/4 animate-pulse rounded bg-dark-100" />
              <div className="h-4 w-full animate-pulse rounded bg-dark-100" />
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
