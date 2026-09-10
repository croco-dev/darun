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
          <ContentArea className="relative z-10 py-16 md:py-24">
            <div className="flex max-w-2xl flex-col gap-5">
              <div className="h-5 w-64 animate-pulse rounded bg-dark-700 motion-reduce:animate-none" />
              <div className="h-10 w-80 animate-pulse rounded-lg bg-dark-700 motion-reduce:animate-none md:h-12" />
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
