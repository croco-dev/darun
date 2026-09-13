import { SectionWrapper } from '@darun/ui';
import { Layout } from '@darun/ui-layout';

export default function Loading() {
  return (
    <Layout>
      <main
        className="flex w-full flex-col"
        aria-busy="true"
        aria-live="polite"
        aria-label="페이지를 불러오는 중입니다"
      >
        <SectionWrapper background="white" spacing="md">
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <div className="h-4 w-8 animate-pulse rounded bg-surface-200 motion-reduce:animate-none" />
              <span className="text-dark-300 text-xs select-none">/</span>
              <div className="h-4 w-16 animate-pulse rounded bg-surface-200 motion-reduce:animate-none" />
            </div>
            <div className="flex flex-col gap-2.5">
              <div className="h-7 w-48 animate-pulse rounded-lg bg-surface-200 motion-reduce:animate-none" />
              <div className="h-4 w-72 animate-pulse rounded bg-surface-200 motion-reduce:animate-none" />
            </div>
            <div className="grid w-full grid-cols-1 gap-3.5 sm:gap-4 md:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={String(i)}
                  className="flex flex-col gap-2.5 rounded-card-lg border border-dark-150 bg-white p-4 sm:p-5 shadow-card"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="h-9 w-9 shrink-0 animate-pulse rounded-xl bg-surface-200 motion-reduce:animate-none" />
                      <div className="h-11 w-11 shrink-0 animate-pulse rounded-xl bg-surface-200 motion-reduce:animate-none" />
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <div className="h-5 w-28 animate-pulse rounded bg-surface-200 motion-reduce:animate-none" />
                        <div className="h-4 w-16 animate-pulse rounded-md bg-surface-200 motion-reduce:animate-none" />
                      </div>
                    </div>
                    <div className="h-7 w-16 shrink-0 animate-pulse rounded-xl bg-surface-200 motion-reduce:animate-none" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="h-4 w-full animate-pulse rounded bg-surface-200 motion-reduce:animate-none" />
                    <div className="h-4 w-3/4 animate-pulse rounded bg-surface-200 motion-reduce:animate-none" />
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
