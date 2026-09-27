'use client';

import {
  CategoryShortcutGrid,
  PopularQueriesStripe,
  SearchProductResult,
  TrendingProductPreview,
} from '@darun/search-shell';
import { Breadcrumb, ContentArea, PageHeading, SectionHeader } from '@darun/ui';
import { Layout } from '@darun/ui-layout';
import { useLocale, useTranslations } from 'next-intl';
import { Suspense } from 'react';

type Props = { searchParams: { [key: string]: string | string[] | undefined } };

function getNormalizedQuery(query: string | string[] | undefined): string {
  if (!query) {
    return '';
  }

  const resolvedQuery = Array.isArray(query) ? (query.find(Boolean) ?? '') : query;
  return resolvedQuery.trim();
}

export function SearchProductPage({ searchParams }: Props) {
  const t = useTranslations('Search');
  const locale = useLocale();
  const isKo = locale === 'ko';
  const query = getNormalizedQuery(searchParams.query);

  if (!query) {
    return (
      <Layout>
        <main className="flex min-h-[calc(100vh-4rem)] w-full flex-col bg-gradient-to-b from-surface-50/60 via-white to-white">
          <ContentArea className="flex flex-col gap-8 pt-5 pb-12 sm:pt-6 sm:pb-16 md:gap-10 md:pt-8 md:pb-20">
            <Breadcrumb
              data-testid="breadcrumb-search-empty"
              items={[
                { label: isKo ? '홈' : 'Home', href: `/${locale}` },
                { label: t('page.title'), ariaCurrent: 'page' },
              ]}
            />
            <PageHeading title={t('page.title')} subtitle={t('page.empty.description')} />
            <div className="flex flex-col gap-4 md:gap-5">
              <SectionHeader title={t('page.popularQueriesTitle')} />
              <PopularQueriesStripe />
            </div>
            <div className="flex flex-col gap-4 md:gap-5">
              <SectionHeader title={t('page.categoriesTitle')} />
              <Suspense
                fallback={
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 md:gap-3" aria-hidden="true">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={String(i)}
                        className="h-14 animate-pulse rounded-xl border border-dark-150/80 bg-surface-100 motion-reduce:animate-none"
                      />
                    ))}
                  </div>
                }
              >
                <CategoryShortcutGrid />
              </Suspense>
            </div>
            <div className="flex flex-col gap-4 md:gap-5">
              <SectionHeader title={t('page.trendingTitle')} />
              <Suspense
                fallback={
                  <div
                    className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:gap-5"
                    aria-hidden="true"
                  >
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={String(i)}
                        className="h-44 sm:h-48 animate-pulse rounded-card-lg border border-dark-150/90 bg-surface-100 motion-reduce:animate-none"
                      />
                    ))}
                  </div>
                }
              >
                <TrendingProductPreview />
              </Suspense>
            </div>
          </ContentArea>
        </main>
      </Layout>
    );
  }

  return (
    <Layout>
      <main className="flex min-h-[calc(100vh-4rem)] w-full flex-col bg-gradient-to-b from-surface-50/60 via-white to-white">
        <ContentArea className="flex flex-col gap-6 pt-5 pb-12 sm:pt-6 sm:pb-16 md:gap-8 md:pt-8 md:pb-20">
          <Breadcrumb
            data-testid="breadcrumb-search-result"
            items={[
              { label: isKo ? '홈' : 'Home', href: `/${locale}` },
              {
                label: t('page.title'),
                href: `/${locale}/search/product`,
              },
              { label: `‘${query}’`, ariaCurrent: 'page' },
            ]}
          />
          <PageHeading title={t('page.resultTitle', { query })} />
          <SearchProductResult query={query} />
        </ContentArea>
      </main>
    </Layout>
  );
}
