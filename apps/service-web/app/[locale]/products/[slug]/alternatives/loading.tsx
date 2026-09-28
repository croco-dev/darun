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
      <main className="flex w-full flex-col" aria-busy="true" aria-live="polite" aria-label={t('loading')}>
        {/* Hero Section Skeleton */}
        <div className="relative overflow-hidden border-b border-dark-150/60 bg-gradient-to-b from-white via-surface-50 to-surface-100/40">
          <ContentArea className="relative z-10 flex flex-col gap-4 pt-5 pb-6 sm:gap-5 sm:pt-6 sm:pb-7 md:pt-8 md:pb-8">
            {/* Breadcrumb Skeleton */}
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <Skeleton className="h-4 w-10 rounded-md" />
              <ChevronRight size={12} className="shrink-0 text-dark-400 stroke-[2.25] select-none" />
              <Skeleton className="h-4 w-24 rounded-md" />
              <ChevronRight size={12} className="shrink-0 text-dark-400 stroke-[2.25] select-none" />
              <Skeleton className="h-4 w-20 rounded-md" />
            </div>

            {/* Product Summary Skeleton */}
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
              <div className="flex w-full items-start gap-3.5 sm:gap-4 md:gap-5">
                <Skeleton className="h-20 w-20 shrink-0 rounded-2xl shadow-card ring-1 ring-black/5 sm:h-24 sm:w-24" />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <Skeleton className="h-8 w-48 rounded-lg sm:h-9 sm:w-64" />
                  <Skeleton className="h-4 w-full max-w-md rounded" />
                  <div className="flex items-center gap-2 pt-1">
                    <Skeleton className="h-6 w-16 rounded-md" />
                    <Skeleton className="h-6 w-16 rounded-md" />
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Skeleton className="h-10 w-20 rounded-xl sm:h-11 sm:w-24" />
                <Skeleton className="h-10 w-20 rounded-xl sm:h-11 sm:w-24" />
                <Skeleton className="h-10 w-10 rounded-xl sm:h-11 sm:w-11" />
              </div>
            </div>
          </ContentArea>
        </div>

        {/* Alternatives Content Skeleton */}
        <ContentArea className="flex flex-col gap-10 pt-6 pb-16 sm:gap-12 md:gap-14 md:pt-8 md:pb-24">
          <div className="flex flex-col gap-4 md:gap-5">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-7 w-48 rounded-lg" />
              <Skeleton className="h-4 w-80 rounded max-w-md" />
            </div>
            <div className="flex flex-col gap-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={String(i)} className="rounded-card-lg border border-dark-150 bg-white p-5 shadow-card">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
                      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                        <Skeleton className="h-5 w-36 rounded" />
                        <Skeleton className="h-4 w-full max-w-sm rounded" />
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <Skeleton className="h-5 w-16 rounded-md" />
                        </div>
                      </div>
                    </div>
                    <Skeleton className="h-9 w-24 rounded-xl shrink-0" />
                  </div>
                </div>
              ))}
              <div className="flex justify-center pt-2">
                <Skeleton className="h-10 w-44 rounded-xl" />
              </div>
            </div>
          </div>

          {/* FAQ Section Skeleton */}
          <div className="flex flex-col gap-4 md:gap-5">
            <Skeleton className="h-7 w-20 rounded-lg" />
            <div className="flex flex-col gap-3">
              <div className="rounded-card-lg border border-dark-150 bg-white p-5 shadow-card">
                <div className="flex items-center justify-between gap-4">
                  <Skeleton className="h-5 w-1/2 rounded" />
                  <Skeleton className="h-8 w-8 rounded-xl" />
                </div>
              </div>
              <div className="rounded-card-lg border border-dark-150 bg-white p-5 shadow-card">
                <div className="flex items-center justify-between gap-4">
                  <Skeleton className="h-5 w-2/5 rounded" />
                  <Skeleton className="h-8 w-8 rounded-xl" />
                </div>
              </div>
            </div>
          </div>
        </ContentArea>
      </main>
    </Layout>
  );
}
