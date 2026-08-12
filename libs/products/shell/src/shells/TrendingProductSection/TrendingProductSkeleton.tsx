import { SectionWrapper } from '@darun/ui';

export const TrendingProductSkeleton = () => {
  return (
    <SectionWrapper background="subtle" spacing="md">
      <div data-testid="skel-trending" className="flex w-full flex-col gap-6">
        <div className="flex h-7 w-48 animate-pulse rounded-lg bg-dark-100" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={String(i)}
              className="flex h-full flex-col gap-4 rounded-card border border-dark-200 bg-white p-5 shadow-card"
            >
              <div className="flex items-center gap-2.5">
                <div className="h-3 w-2 animate-pulse rounded bg-dark-100 motion-reduce:animate-none" />
                <div className="h-px flex-1 bg-dark-200" />
              </div>
              <div className="flex flex-col gap-3">
                <div className="h-14 w-14 animate-pulse rounded-xl bg-dark-100 motion-reduce:animate-none" />
                <div className="flex flex-col gap-1">
                  <div className="h-6 w-3/4 animate-pulse rounded bg-dark-100 motion-reduce:animate-none" />
                  <div className="h-4 w-full animate-pulse rounded bg-dark-100 motion-reduce:animate-none" />
                </div>
                <div className="h-5 w-16 animate-pulse rounded-chip bg-dark-100 motion-reduce:animate-none" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
};
