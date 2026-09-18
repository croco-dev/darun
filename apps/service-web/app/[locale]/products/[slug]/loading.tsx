'use client';

import { ContentArea } from '@darun/ui';
import { Layout } from '@darun/ui-layout';
import { useTranslations } from 'next-intl';

const Skeleton = ({ className = '' }: { className?: string }) => (
  <div
    aria-hidden="true"
    className={`${className} bg-gradient-to-r from-surface-100 via-surface-200 to-surface-100 animate-pulse motion-reduce:animate-none`}
  />
);

export default function Loading() {
  const t = useTranslations('ProductDetail');
  const loadingText = t('loading');

  return (
    <Layout>
      <main className="flex w-full flex-col" aria-busy="true" aria-live="polite" aria-label={loadingText}>
        <div className="py-6 md:py-8">
          <ContentArea>
            {/* Breadcrumb Skeleton */}
            <div className="flex items-center gap-1.5 pb-4" aria-hidden="true">
              <div className="h-4 w-8 animate-pulse rounded bg-surface-200 motion-reduce:animate-none" />
              <span className="text-dark-300 text-xs select-none">/</span>
              <div className="h-4 w-28 animate-pulse rounded bg-surface-200 motion-reduce:animate-none" />
            </div>

            {/* Product Summary Skeleton */}
            <div
              data-testid="skel-product-hero"
              className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6"
            >
              <div className="flex items-start gap-3">
                <Skeleton className="h-24 w-24 rounded-2xl" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-7 w-[180px] rounded-md" />
                  <Skeleton className="h-[18px] w-[280px] rounded" />
                  <div className="flex gap-1.5 pt-1">
                    <Skeleton className="h-[22px] w-[72px] rounded-md" />
                    <Skeleton className="h-[22px] w-[72px] rounded-md" />
                  </div>
                </div>
              </div>
            </div>
          </ContentArea>
        </div>

        <ContentArea id="detail-content" className="flex flex-col gap-8 py-6 md:gap-10 md:py-8">
          {/* Product Description Section Skeleton */}
          <div data-testid="skel-product-desc" className="flex flex-col gap-4 md:gap-5">
            <Skeleton className="h-6 w-[120px] rounded-md" />
            <div className="rounded-card-lg border border-dark-150 bg-white p-5 shadow-card md:p-6">
              <div className="flex flex-col gap-2.5">
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-11/12 rounded" />
                <Skeleton className="h-4 w-3/4 rounded" />
              </div>
            </div>
          </div>

          {/* Product Photo Section Skeleton */}
          <div data-testid="skel-product-image" className="flex flex-col gap-4 md:gap-5">
            <Skeleton className="h-6 w-[100px] rounded-md" />
            <div className="overflow-hidden rounded-card-lg border border-dark-150 bg-white p-4 shadow-card md:p-5">
              <Skeleton className="h-56 w-full rounded-lg" />
            </div>
          </div>

          {/* Product Feature Section Skeleton */}
          <div data-testid="skel-product-feature" className="flex flex-col gap-4 md:gap-5">
            <Skeleton className="h-6 w-20 rounded-md" />
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
              <div className="rounded-card-lg border border-dark-150 bg-white p-5 shadow-card">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-5 w-[120px] rounded" />
                    <Skeleton className="h-3.5 w-full rounded" />
                  </div>
                </div>
              </div>
              <div className="rounded-card-lg border border-dark-150 bg-white p-5 shadow-card">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-5 w-[120px] rounded" />
                    <Skeleton className="h-3.5 w-full rounded" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ContentArea>
      </main>
    </Layout>
  );
}
