'use client';

import { ChevronRight, ContentArea } from '@darun/ui';
import { Layout } from '@darun/ui-layout';
import { useTranslations } from 'next-intl';

const Skeleton = ({ className = '' }: { className?: string }) => (
  <div
    aria-hidden="true"
    className={`${className} animate-pulse bg-gradient-to-r from-surface-100 via-surface-200 to-surface-100 motion-reduce:animate-none`}
  />
);

export default function Loading() {
  const t = useTranslations('Common');

  return (
    <Layout>
      <main
        className="flex min-h-[calc(100vh-4rem)] w-full flex-col bg-gradient-to-b from-surface-50/60 via-white to-white"
        aria-busy="true"
        aria-live="polite"
        aria-label={t('loading')}
      >
        <ContentArea className="flex flex-col gap-8 py-6 md:gap-12 md:py-8">
          {/* Breadcrumb Skeleton */}
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <Skeleton className="h-4 w-8 rounded-md" />
            <ChevronRight size={12} className="shrink-0 text-dark-400 stroke-[2.25] select-none" />
            <Skeleton className="h-4 w-20 rounded-md" />
          </div>

          {/* Heading Skeleton */}
          <div className="flex flex-col items-center gap-2.5 text-center">
            <Skeleton className="h-8 w-64 rounded-lg sm:h-9 sm:w-80" />
            <Skeleton className="h-4 w-72 rounded max-w-sm" />
          </div>

          {/* Product Cards Side-by-Side Skeleton */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={String(i)}
                className="flex min-h-[160px] sm:min-h-[180px] h-full flex-col justify-between rounded-card-lg border border-dark-150/90 bg-white p-4 shadow-card sm:p-5"
              >
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-5 w-3/4 rounded" />
                    <Skeleton className="h-4 w-full rounded" />
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <Skeleton className="h-5 w-16 rounded-md" />
                    <Skeleton className="h-6 w-12 rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Comparison Table Skeleton */}
          <div className="overflow-hidden rounded-card-xl border border-dark-150 bg-white shadow-card">
            {/* Header Row */}
            <div className="grid grid-cols-2 divide-x divide-dark-150/80 border-b border-dark-150/80 bg-surface-100/95 backdrop-blur-md p-3.5 sm:p-4 md:p-5 shadow-2xs">
              <div className="flex items-center gap-2.5 pr-3 sm:pr-4 md:pr-5">
                <Skeleton className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg shrink-0" />
                <Skeleton className="h-5 w-28 rounded" />
              </div>
              <div className="flex items-center gap-2.5 pl-3 sm:pl-4 md:pl-5">
                <Skeleton className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg shrink-0" />
                <Skeleton className="h-5 w-28 rounded" />
              </div>
            </div>

            {/* Attribute Rows */}
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={String(i)} className={`p-4 md:p-5 ${i === 4 ? '' : 'border-b border-dark-150/70'}`}>
                <Skeleton className="mb-2 h-3.5 w-16 rounded" />
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-0 md:divide-x md:divide-dark-150/70">
                  <div className="md:pr-5">
                    {i === 3 ? (
                      <Skeleton className="h-6 w-16 rounded-full" />
                    ) : (
                      <Skeleton className="h-4 w-4/5 rounded" />
                    )}
                  </div>
                  <div className="border-t border-dark-100/70 pt-2.5 md:border-0 md:pt-0 md:pl-5">
                    {i === 3 ? (
                      <Skeleton className="h-6 w-16 rounded-full" />
                    ) : (
                      <Skeleton className="h-4 w-3/4 rounded" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ContentArea>
      </main>
    </Layout>
  );
}
