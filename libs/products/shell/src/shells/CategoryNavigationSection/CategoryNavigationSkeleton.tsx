import { SectionWrapper } from '@darun/ui';

const PILL_WIDTHS = [
  'w-28 sm:w-36',
  'w-32 sm:w-40',
  'w-24 sm:w-32',
  'w-36 sm:w-44',
  'w-28 sm:w-36',
  'w-32 sm:w-40',
  'w-24 sm:w-32',
  'w-32 sm:w-40',
];

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
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-7 w-48 rounded-lg" />
            <Skeleton className="h-5 w-16 rounded" />
          </div>
          <Skeleton className="h-4 w-56 rounded max-w-sm" />
        </div>
        <div className="flex flex-wrap gap-2.5 md:gap-3">
          {PILL_WIDTHS.map((w, i) => (
            <Skeleton key={String(i)} className={`h-10 sm:h-11 rounded-full ${w}`} />
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
};
