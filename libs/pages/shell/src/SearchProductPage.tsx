'use client';

import {
  CategoryShortcutGrid,
  PopularQueriesStripe,
  SearchProductResult,
  TrendingProductPreview,
} from '@darun/search-shell';
import { ContentArea, SectionHeader } from '@darun/ui';
import { Layout } from '@darun/ui-layout';
import { useTranslations } from 'next-intl';

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
  const query = getNormalizedQuery(searchParams.query);

  if (!query) {
    return (
      <Layout>
        <main className="flex w-full flex-col">
          <ContentArea className="flex flex-col gap-8 py-6 md:gap-10 md:py-8">
            <div className="flex flex-col gap-4">
              <SectionHeader title={t('page.popularQueriesTitle')} />
              <PopularQueriesStripe />
            </div>
            <div className="flex flex-col gap-4">
              <SectionHeader title={t('page.categoriesTitle')} />
              <CategoryShortcutGrid />
            </div>
            <div className="flex flex-col gap-4">
              <SectionHeader title={t('page.trendingTitle')} />
              <TrendingProductPreview />
            </div>
          </ContentArea>
        </main>
      </Layout>
    );
  }

  return (
    <Layout>
      <main className="flex w-full flex-col">
        <ContentArea className="flex flex-col gap-6 py-6 md:gap-8 md:py-8">
          <SectionHeader title={t('page.resultTitle', { query })} />
          <SearchProductResult query={query} />
        </ContentArea>
      </main>
    </Layout>
  );
}
