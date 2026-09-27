'use client';

import { SectionWrapper } from '@darun/ui';
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
        <SectionWrapper background="white" spacing="md">
          <div className="flex flex-col gap-6 md:gap-8">
            {/* Breadcrumb Skeleton */}
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <Skeleton className="h-4 w-8 rounded-md" />
              <span className="text-dark-300 text-xs select-none">/</span>
              <Skeleton className="h-4 w-20 rounded-md" />
            </div>

            {/* Category Header Skeleton */}
            <div className="flex items-start gap-4 sm:gap-5">
              <Skeleton className="h-12 w-12 shrink-0 rounded-2xl sm:h-14 sm:w-14" />
              <div className="flex flex-1 flex-col gap-2">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="h-8 w-44 rounded-lg sm:h-9 sm:w-56" />
                  <Skeleton className="h-6 w-16 rounded-lg" />
                </div>
                <Skeleton className="h-4 w-72 rounded max-w-md" />
              </div>
            </div>

            {/* Product Cards Grid Skeleton */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 lg:gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={String(i)}
                  className="flex h-full flex-col justify-between rounded-card-lg border border-dark-150/90 bg-white p-4 shadow-card sm:p-5"
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
          </div>
        </SectionWrapper>
      </main>
    </Layout>
  );
}
