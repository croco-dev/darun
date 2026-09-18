import { SectionWrapper } from '@darun/ui';
import { Layout } from '@darun/ui-layout';

const Skeleton = ({ className = '' }: { className?: string }) => (
  <div
    aria-hidden="true"
    className={`${className} animate-pulse bg-gradient-to-r from-surface-100 via-surface-200 to-surface-100 motion-reduce:animate-none`}
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
        <SectionWrapper background="white" spacing="md">
          <div className="flex flex-col gap-5 sm:gap-6 md:gap-8">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <Skeleton className="h-4 w-8 rounded-md" />
              <span className="text-dark-300 text-xs select-none">/</span>
              <Skeleton className="h-4 w-16 rounded-md" />
            </div>
            <div className="flex flex-col gap-2.5">
              <Skeleton className="h-8 w-48 rounded-lg sm:h-9 sm:w-64" />
              <Skeleton className="h-4 w-72 rounded max-w-md" />
            </div>
            <div className="grid w-full grid-cols-1 gap-3.5 sm:gap-4 md:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={String(i)}
                  className="flex flex-col gap-2.5 rounded-card-lg border border-dark-150 bg-white p-4 sm:p-5 shadow-card"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
                      <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <Skeleton className="h-5 w-28 rounded" />
                        <Skeleton className="h-4 w-16 rounded-md" />
                      </div>
                    </div>
                    <Skeleton className="h-7 w-16 shrink-0 rounded-xl" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Skeleton className="h-4 w-full rounded" />
                    <Skeleton className="h-4 w-3/4 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SectionWrapper>
      </main>
    </Layout>
  );
}
