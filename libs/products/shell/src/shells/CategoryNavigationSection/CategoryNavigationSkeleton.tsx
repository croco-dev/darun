import { SectionWrapper } from '@darun/ui';

const PILL_WIDTHS = ['w-16', 'w-24', 'w-20', 'w-28', 'w-16', 'w-20', 'w-24', 'w-16'];

const Skeleton = ({ className = '' }: { className?: string }) => (
  <div
    aria-hidden="true"
    className={`${className} animate-pulse bg-gradient-to-r from-surface-100 via-surface-200 to-surface-100 motion-reduce:animate-none`}
  />
);

export const CategoryNavigationSkeleton = () => {
  return (
    <SectionWrapper background="white" spacing="sm">
      <div data-testid="skel-category" className="flex w-full flex-col gap-5 md:gap-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-48 rounded-lg" />
          <Skeleton className="h-5 w-16 rounded" />
        </div>
        <div className="flex flex-wrap gap-2 md:gap-3">
          {PILL_WIDTHS.map((w, i) => (
            <Skeleton key={String(i)} className={`h-9 rounded-full ${w}`} />
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
};
