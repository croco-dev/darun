import { ContentArea } from '@darun/ui';
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
        <ContentArea className="flex flex-col gap-6 py-6 md:gap-8 md:py-8">
          <div className="h-4 w-40 animate-pulse rounded bg-dark-100 motion-reduce:animate-none" />
          <div
            data-testid="skel-magazine-hero"
            aria-hidden="true"
            className="relative overflow-hidden rounded-card-xl border border-dark-150 bg-dark-900 py-8 shadow-card sm:py-12 lg:py-14"
          >
            <div className="flex flex-col gap-5 px-6 sm:px-8 lg:px-12">
              <div className="h-6 w-24 animate-pulse rounded-lg bg-white/20 motion-reduce:animate-none" />
              <div className="flex max-w-3xl flex-col gap-3">
                <div className="h-9 w-4/5 animate-pulse rounded-lg bg-white/20 motion-reduce:animate-none" />
                <div className="h-6 w-3/5 animate-pulse rounded-lg bg-white/20 motion-reduce:animate-none" />
                <div className="h-4 w-1/3 animate-pulse rounded-md bg-white/15 motion-reduce:animate-none" />
              </div>
            </div>
          </div>
          <div className="flex max-w-3xl flex-col gap-4 pt-4">
            <div className="h-4 w-full animate-pulse rounded bg-dark-100 motion-reduce:animate-none" />
            <div className="h-4 w-11/12 animate-pulse rounded bg-dark-100 motion-reduce:animate-none" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-dark-100 motion-reduce:animate-none" />
          </div>
        </ContentArea>
      </main>
    </Layout>
  );
}
