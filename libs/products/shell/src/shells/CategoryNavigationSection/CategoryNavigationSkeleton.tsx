import { SectionWrapper } from '@darun/ui';

const PILL_WIDTHS = ['w-16', 'w-24', 'w-20', 'w-28', 'w-16', 'w-20', 'w-24', 'w-16'];

export const CategoryNavigationSkeleton = () => {
  return (
    <SectionWrapper background="white" spacing="md">
      <div data-testid="skel-category" className="flex w-full flex-col gap-5 md:gap-6">
        <div className="flex items-center justify-between">
          <div className="h-7 w-48 animate-pulse rounded-lg bg-dark-100 motion-reduce:animate-none" />
          <div className="h-5 w-16 animate-pulse rounded bg-dark-100 motion-reduce:animate-none" />
        </div>
        <div className="flex flex-wrap gap-2 md:gap-3">
          {PILL_WIDTHS.map((w, i) => (
            <div
              key={String(i)}
              className={`h-9 animate-pulse rounded-full bg-dark-100 motion-reduce:animate-none ${w}`}
            />
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
};
