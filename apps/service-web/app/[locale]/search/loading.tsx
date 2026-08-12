import { SearchProductListSkeleton } from '@darun/search-shell';
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
          <div className="h-7 w-48 animate-pulse rounded-lg bg-dark-100 motion-reduce:animate-none" />
          <SearchProductListSkeleton />
        </ContentArea>
      </main>
    </Layout>
  );
}
