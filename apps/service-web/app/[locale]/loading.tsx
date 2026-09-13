import { CategoryNavigationSkeleton } from '@darun/products-shell/src/shells/CategoryNavigationSection/CategoryNavigationSkeleton';
import { RecentProductSkeleton } from '@darun/products-shell/src/shells/RecentProductSection/RecentProductSkeleton';
import { TrendingProductSkeleton } from '@darun/products-shell/src/shells/TrendingProductSection/TrendingProductSkeleton';
import { ContentArea } from '@darun/ui';
import { Layout } from '@darun/ui-layout';

export default function Loading() {
  return (
    <Layout>
      <main className="flex flex-col" aria-busy="true" aria-live="polite" aria-label="페이지를 불러오는 중입니다">
        <section className="relative isolate overflow-hidden bg-dark-900">
          <ContentArea className="relative z-10 py-14 sm:py-18 md:py-22">
            <div className="flex max-w-2xl flex-col gap-5 md:gap-6">
              <div className="h-7 w-64 animate-pulse rounded-full bg-white/10 motion-reduce:animate-none" />
              <div className="flex flex-col gap-3">
                <div className="h-5 w-48 animate-pulse rounded bg-white/10 motion-reduce:animate-none" />
                <div className="h-10 w-4/5 animate-pulse rounded-lg bg-white/15 motion-reduce:animate-none sm:h-12 md:h-14" />
              </div>
              <div className="flex max-w-xl flex-col gap-1.5">
                <div className="h-4 w-full animate-pulse rounded bg-white/10 motion-reduce:animate-none" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-white/10 motion-reduce:animate-none" />
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <div className="h-4 w-12 animate-pulse rounded bg-white/10 motion-reduce:animate-none" />
                <div className="h-6 w-16 animate-pulse rounded-full bg-white/10 motion-reduce:animate-none" />
                <div className="h-6 w-20 animate-pulse rounded-full bg-white/10 motion-reduce:animate-none" />
                <div className="h-6 w-16 animate-pulse rounded-full bg-white/10 motion-reduce:animate-none" />
                <div className="h-6 w-24 animate-pulse rounded-full bg-white/10 motion-reduce:animate-none" />
              </div>
            </div>
          </ContentArea>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 left-1/2 h-20 w-3/4 -translate-x-1/2 bg-[radial-gradient(ellipse_at_bottom,rgba(217,144,73,0.14),transparent_70%)]"
          />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brown-500/25 to-transparent" />
        </section>

        <CategoryNavigationSkeleton />
        <TrendingProductSkeleton />
        <RecentProductSkeleton />
      </main>
    </Layout>
  );
}
