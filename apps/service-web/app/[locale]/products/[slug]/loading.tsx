'use client';

import { ContentArea } from '@darun/ui';
import { Layout } from '@darun/ui-layout';
import { useTranslations } from 'next-intl';

const Skeleton = ({ className = '' }: { className?: string }) => (
  <div
    aria-hidden="true"
    className={`${className} animate-pulse bg-gradient-to-r from-surface-100 via-surface-200 to-surface-100 motion-reduce:animate-none`}
  />
);

export default function Loading() {
  const t = useTranslations('ProductDetail');
  const loadingText = t('loading');

  return (
    <Layout>
      <main
        className="flex w-full flex-col"
        aria-busy="true"
        aria-live="polite"
        aria-label={loadingText}
      >
        {/* Hero Section Skeleton */}
        <div className="relative overflow-hidden border-b border-dark-150/60 bg-gradient-to-b from-white via-surface-50 to-surface-100/40">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 left-1/2 -z-0 h-96 w-96 -translate-x-1/2 rounded-full bg-gradient-to-tr from-brown-100/30 via-surface-200/40 to-transparent blur-3xl motion-reduce:hidden"
          />
          <ContentArea className="relative z-10 flex flex-col gap-4 pt-5 pb-6 sm:gap-5 sm:pt-6 sm:pb-7 md:pt-8 md:pb-8">
            {/* Breadcrumb Skeleton */}
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <Skeleton className="h-4 w-10 rounded-md" />
              <span className="text-dark-300 select-none text-xs">/</span>
              <Skeleton className="h-4 w-28 rounded-md" />
            </div>

            {/* Product Summary Skeleton */}
            <div
              data-testid="skel-product-hero"
              className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6"
            >
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

            {/* Primary Link Button Skeleton */}
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-11 w-40 rounded-xl" />
            </div>
          </ContentArea>
        </div>

        {/* TOC Skeleton */}
        <div className="relative border-y border-dark-150 bg-white/90 backdrop-blur-md">
          <ContentArea className="py-2.5">
            <div className="flex gap-2 overflow-hidden">
              <Skeleton className="h-8 w-20 rounded-full" />
              <Skeleton className="h-8 w-20 rounded-full" />
              <Skeleton className="h-8 w-20 rounded-full" />
              <Skeleton className="h-8 w-24 rounded-full" />
              <Skeleton className="h-8 w-20 rounded-full" />
            </div>
          </ContentArea>
        </div>

        <ContentArea
          id="detail-content"
          className="flex flex-col gap-10 pt-6 pb-16 sm:gap-12 md:gap-14 md:pt-8 md:pb-24"
        >
          {/* Product Description Section Skeleton */}
          <div data-testid="skel-product-desc" className="flex flex-col gap-4 md:gap-5">
            <Skeleton className="h-7 w-28 rounded-lg" />
            <div className="rounded-card-lg border border-dark-150 bg-white p-5 shadow-card sm:p-6 md:p-8">
              <div className="flex flex-col gap-3">
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-11/12 rounded" />
                <Skeleton className="h-4 w-4/5 rounded" />
                <div className="my-3 flex flex-col gap-2 rounded-xl border border-dark-100 bg-surface-50 p-4">
                  <Skeleton className="h-4 w-1/3 rounded" />
                  <Skeleton className="h-3.5 w-3/4 rounded" />
                </div>
                <Skeleton className="h-4 w-2/3 rounded" />
              </div>
            </div>
          </div>

          {/* Product Photo Section Skeleton */}
          <div data-testid="skel-product-image" className="flex flex-col gap-4 md:gap-5">
            <Skeleton className="h-7 w-24 rounded-lg" />
            <div className="overflow-hidden rounded-card-lg border border-dark-150 bg-white p-4 shadow-card sm:p-5 md:p-6">
              <div className="flex gap-3.5 overflow-hidden">
                <Skeleton className="h-56 w-80 shrink-0 rounded-xl sm:h-64 sm:w-96" />
                <Skeleton className="h-56 w-80 shrink-0 rounded-xl sm:h-64 sm:w-96" />
              </div>
            </div>
          </div>

          {/* Product Feature Section Skeleton */}
          <div data-testid="skel-product-feature" className="flex flex-col gap-4 md:gap-5">
            <Skeleton className="h-7 w-24 rounded-lg" />
            <div className="flex flex-col gap-3.5 sm:gap-4">
              <div className="rounded-card-lg border border-dark-150 bg-white p-5 shadow-card sm:p-6">
                <div className="flex items-start gap-3.5">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-xl sm:h-11 sm:w-11" />
                  <div className="flex flex-1 flex-col gap-2 pt-0.5">
                    <Skeleton className="h-5 w-36 rounded" />
                    <Skeleton className="h-4 w-3/4 rounded" />
                  </div>
                </div>
              </div>
              <div className="rounded-card-lg border border-dark-150 bg-white p-5 shadow-card sm:p-6">
                <div className="flex items-start gap-3.5">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-xl sm:h-11 sm:w-11" />
                  <div className="flex flex-1 flex-col gap-2 pt-0.5">
                    <Skeleton className="h-5 w-40 rounded" />
                    <Skeleton className="h-4 w-2/3 rounded" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Alternative Section Skeleton */}
          <div className="flex flex-col gap-4 md:gap-5">
            <Skeleton className="h-7 w-28 rounded-lg" />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
              <div className="rounded-card-lg border border-dark-150 bg-white p-4 shadow-card sm:p-5">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-4 w-28 rounded" />
                    <Skeleton className="h-3.5 w-44 rounded" />
                  </div>
                </div>
              </div>
              <div className="rounded-card-lg border border-dark-150 bg-white p-4 shadow-card sm:p-5">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-4 w-32 rounded" />
                    <Skeleton className="h-3.5 w-40 rounded" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Company Section Skeleton */}
          <div className="flex flex-col gap-4 md:gap-5">
            <Skeleton className="h-7 w-24 rounded-lg" />
            <div className="rounded-card-lg border border-dark-150 bg-white p-5 shadow-card sm:p-6 md:p-8">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3.5">
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
              </div>
            </div>
          </div>
        </ContentArea>
      </main>
    </Layout>
  );
}
