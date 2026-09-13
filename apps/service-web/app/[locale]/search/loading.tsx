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
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <div className="h-4 w-8 animate-pulse rounded bg-surface-200 motion-reduce:animate-none" />
            <span className="text-dark-300 text-xs select-none">/</span>
            <div className="h-4 w-12 animate-pulse rounded bg-surface-200 motion-reduce:animate-none" />
            <span className="text-dark-300 text-xs select-none">/</span>
            <div className="h-4 w-20 animate-pulse rounded bg-surface-200 motion-reduce:animate-none" />
          </div>
          <div className="h-7 w-48 animate-pulse rounded-lg bg-surface-200 motion-reduce:animate-none" />
          <SearchProductListSkeleton />
        </ContentArea>
      </main>
    </Layout>
  );
}
