export const CategoryNavigationSkeleton = () => {
  return (
    <div data-testid="skel-category" className="flex w-full flex-col gap-6">
      <div className="flex h-7 w-48 animate-pulse rounded-lg bg-dark-100" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={String(i)}
            className="flex min-h-[144px] flex-col justify-between rounded-[20px] border border-dark-100 bg-white p-4 sm:p-5"
          >
            <div className="flex h-12 w-12 animate-pulse rounded-xl bg-dark-100" />
            <div className="flex flex-col gap-1">
              <div className="h-4 w-20 animate-pulse rounded bg-dark-100" />
              <div className="h-3 w-12 animate-pulse rounded bg-dark-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
