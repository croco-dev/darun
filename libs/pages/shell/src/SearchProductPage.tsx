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

  const resolvedQuery = Array.isArray(query) ? query.find(Boolean) ?? '' : query;
  return resolvedQuery.trim();
}

export function SearchProductPage({ searchParams }: Props) {
  const t = useTranslations('Search');
  const query = getNormalizedQuery(searchParams.query);

  if (!query) {
    return (
      <Layout>
        <main className="flex w-full flex-col">
          <ContentArea className="flex flex-col gap-5 py-6 md:py-8">
            <PopularQueriesStripe />
            <CategoryShortcutGrid />
            <TrendingProductPreview />
          </ContentArea>
        </main>
      </Layout>
    );
  }

  return (
    <Layout>
      <main className="flex w-full flex-col">
        <ContentArea className="flex flex-col gap-5 py-6 md:py-8">
          <SectionHeader title={t('page.resultTitle', { query })} />
          <SearchProductResult query={query} />
        </ContentArea>
      </main>
    </Layout>
  );
}
