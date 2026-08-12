import { SectionWrapper } from '@darun/ui';

export const CategoryNavigationSkeleton = () => {
  return (
    <SectionWrapper background="white" spacing="md">
      <div data-testid="skel-category" className="flex w-full flex-col gap-6">
        <div className="flex h-7 w-48 animate-pulse rounded-lg bg-dark-100" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={String(i)}
              className="flex min-h-36 flex-col justify-between rounded-card border border-dark-200 bg-white p-4 motion-reduce:animate-none sm:p-5"
            >
              <div className="flex h-12 w-12 animate-pulse motion-reduce:animate-none rounded-xl bg-dark-100" />
              <div className="flex flex-col gap-1">
                <div className="h-4 w-20 animate-pulse motion-reduce:animate-none rounded bg-dark-100" />
                <div className="h-3 w-12 animate-pulse motion-reduce:animate-none rounded bg-dark-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
};
