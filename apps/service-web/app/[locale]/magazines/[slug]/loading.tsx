import { ContentArea } from '@darun/ui';
import { Layout } from '@darun/ui-layout';

const Skeleton = ({ className = '' }: { className?: string }) => (
  <div
    aria-hidden="true"
    className={`${className} animate-pulse bg-gradient-to-r from-surface-100 via-surface-200 to-surface-100 motion-reduce:animate-none`}
  />
);

const DarkSkeleton = ({ className = '' }: { className?: string }) => (
  <div
    aria-hidden="true"
    className={`${className} animate-pulse bg-gradient-to-r from-white/10 via-white/20 to-white/10 motion-reduce:animate-none`}
  />
);

export default function Loading() {
  return (
    <Layout>
      <main
        className="flex min-h-[calc(100vh-4rem)] w-full flex-col bg-gradient-to-b from-surface-50/60 via-white to-white"
        aria-busy="true"
        aria-live="polite"
        aria-label="페이지를 불러오는 중입니다"
      >
        <ContentArea className="flex flex-col gap-6 pt-5 pb-12 sm:pt-6 sm:pb-16 md:gap-8 md:pt-8 md:pb-20">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <Skeleton className="h-4 w-10 rounded-md" />
            <span className="text-dark-300 text-xs select-none">/</span>
            <Skeleton className="h-4 w-28 rounded-md" />
          </div>
          <div
            data-testid="skel-magazine-hero"
            aria-hidden="true"
            className="relative overflow-hidden rounded-card-xl border border-dark-150 bg-dark-900 py-8 shadow-card sm:py-12 lg:py-14"
          >
            <div className="flex flex-col gap-5 px-6 sm:px-8 lg:px-12">
              <DarkSkeleton className="h-6 w-24 rounded-lg" />
              <div className="flex max-w-3xl flex-col gap-3">
                <DarkSkeleton className="h-9 w-4/5 rounded-lg" />
                <DarkSkeleton className="h-6 w-3/5 rounded-lg" />
                <DarkSkeleton className="h-4 w-1/3 rounded-md" />
              </div>
            </div>
          </div>
          <div className="flex max-w-3xl flex-col gap-4 pt-4">
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-11/12 rounded" />
            <Skeleton className="h-4 w-4/5 rounded" />
          </div>
        </ContentArea>
      </main>
    </Layout>
  );
}
