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
        </section>

        <CategoryNavigationSkeleton />
        <TrendingProductSkeleton />
        <RecentProductSkeleton />
      </main>
    </Layout>
  );
}
