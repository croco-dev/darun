'use client';

import { CategoryShortcutGrid, PopularQueriesStripe, SearchProductResult, TrendingProductPreview } from '@darun/search-shell';
import { ContentArea } from '@darun/ui';
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
      <main className="flex w-full flex-col gap-4 py-6">
        <ContentArea>
          <div className="flex flex-col gap-4">
            <PopularQueriesStripe />
            <CategoryShortcutGrid />
            <TrendingProductPreview />
          </div>
        </ContentArea>
      </main>
    </Layout>
  );
  }

  return (
    <Layout>
      <main className="flex w-full flex-col py-5">
        <ContentArea>
          <div className="flex flex-col gap-5">
            <p className="text-[22px] font-semibold tracking-[-0.2px]">{t('page.resultTitle', { query })}</p>
            <SearchProductResult query={query} />
          </div>
        </ContentArea>
      </main>
    </Layout>
  );
}
