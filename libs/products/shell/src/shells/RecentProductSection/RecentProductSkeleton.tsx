import { SectionWrapper } from '@darun/ui';

export const RecentProductSkeleton = () => {
  return (
    <SectionWrapper background="white" spacing="md">
      <div data-testid="skel-recent" className="flex w-full flex-col gap-5 md:gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="h-7 w-48 animate-pulse rounded-lg bg-dark-100 motion-reduce:animate-none" />
            <div className="h-5 w-16 animate-pulse rounded bg-dark-100 motion-reduce:animate-none" />
          </div>
          <div className="h-4 w-64 animate-pulse rounded bg-dark-100 motion-reduce:animate-none" />
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 lg:gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={String(i)}
              className="flex h-full flex-col gap-4 rounded-card border border-dark-150 bg-white p-4 shadow-card md:gap-5 md:p-5"
            >
              <div className="h-14 w-14 animate-pulse rounded-xl bg-dark-100 motion-reduce:animate-none" />
              <div className="flex flex-col gap-0.5">
                <div className="h-6 w-3/4 animate-pulse rounded bg-dark-100 motion-reduce:animate-none" />
                <div className="h-4 w-full animate-pulse rounded bg-dark-100 motion-reduce:animate-none" />
              </div>
              <div className="h-5 w-16 animate-pulse rounded-chip bg-dark-100 motion-reduce:animate-none" />
            </div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
};
