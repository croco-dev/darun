import { SearchProductListSkeleton } from '@darun/search-shell';
import { ContentArea } from '@darun/ui';
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
        <ContentArea className="flex flex-col gap-6 pt-5 pb-12 sm:pt-6 sm:pb-16 md:gap-8 md:pt-8 md:pb-20">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <Skeleton className="h-4 w-8 rounded-md" />
            <span className="text-dark-300 text-xs select-none">/</span>
            <Skeleton className="h-4 w-12 rounded-md" />
            <span className="text-dark-300 text-xs select-none">/</span>
            <Skeleton className="h-4 w-20 rounded-md" />
          </div>
          <Skeleton className="h-8 w-48 rounded-lg sm:h-9 sm:w-64" />
          <SearchProductListSkeleton />
        </ContentArea>
      </main>
    </Layout>
  );
}
