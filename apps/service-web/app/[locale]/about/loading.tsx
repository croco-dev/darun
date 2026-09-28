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
        <ContentArea className="flex max-w-4xl flex-col gap-8 py-10 md:gap-10 md:py-16">
          {/* Breadcrumb Skeleton */}
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <Skeleton className="h-4 w-8 rounded-md" />
            <ChevronRight size={12} className="shrink-0 text-dark-400 stroke-[2.25] select-none" />
            <Skeleton className="h-4 w-16 rounded-md" />
          </div>

          {/* Heading Skeleton */}
          <div className="flex flex-col gap-3">
            <Skeleton className="h-6 w-36 rounded-full" />
            <Skeleton className="h-8 w-72 rounded-lg sm:h-9 sm:w-96" />
            <Skeleton className="h-4 w-full max-w-lg rounded" />
          </div>

          {/* Highlight Callout Card Skeleton */}
          <div className="rounded-card-lg border border-dark-150/80 bg-white p-6 shadow-card md:p-8">
            <div className="flex items-start gap-3.5">
              <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-5 w-48 rounded" />
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-3/4 rounded" />
              </div>
            </div>
          </div>

          {/* Sections List Skeleton */}
          <div className="flex flex-col gap-5 md:gap-6" aria-busy="true" aria-live="polite">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={String(i)}
                className="flex flex-col gap-3 rounded-card-lg border border-dark-150/80 bg-white p-6 shadow-card md:p-7"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="h-7 w-7 shrink-0 rounded-lg" />
                  <Skeleton className="h-6 w-56 rounded" />
                </div>
                <div className="flex flex-col gap-1.5 md:pl-10">
                  <Skeleton className="h-4 w-full rounded" />
                  <Skeleton className="h-4 w-5/6 rounded" />
                </div>
              </div>
            ))}
          </div>
        </ContentArea>
      </main>
    </Layout>
  );
}
