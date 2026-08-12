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
        <ContentArea>
          <div className="py-8 sm:py-12 lg:py-14">
            <div
              data-testid="skel-magazine-hero"
              aria-hidden="true"
              className="relative overflow-hidden rounded-card-xl bg-dark-800 py-8 sm:py-12 lg:py-14"
            >
              <div className="flex flex-col gap-5 px-6 sm:px-8 lg:px-12">
                <div className="h-6 w-24 animate-pulse rounded-pill bg-white/20 motion-reduce:animate-none" />
                <div className="flex max-w-3xl flex-col gap-3">
                  <div className="h-9 w-4/5 animate-pulse rounded-chip bg-white/20 motion-reduce:animate-none" />
                  <div className="h-6 w-3/5 animate-pulse rounded-chip bg-white/20 motion-reduce:animate-none" />
                  <div className="h-4 w-1/3 animate-pulse rounded-chip bg-white/15 motion-reduce:animate-none" />
                </div>
              </div>
            </div>
          </div>
        </ContentArea>
      </main>
    </Layout>
  );
}
