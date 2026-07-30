import { gql } from '@apollo/client';
import {
  CategoryNavigationSection,
  MainHeroBanner,
  RecentProductSection,
  TrendingProductSection,
} from '@darun/products-shell';
import { CategoryNavigationSkeleton } from '@darun/products-shell/src/shells/CategoryNavigationSection/CategoryNavigationSkeleton';
import { RecentProductSkeleton } from '@darun/products-shell/src/shells/RecentProductSection/RecentProductSkeleton';
import { TrendingProductSkeleton } from '@darun/products-shell/src/shells/TrendingProductSection/TrendingProductSkeleton';
import { Layout } from '@darun/ui-layout';
import { Suspense } from 'react';
import { getClient } from '../getServerClient';

const productsCountQuery = gql`
  query ProductsCountOnHomePage {
    productsCount
  }
`;

export const revalidate = 3600;

export default async function HomePage() {
  const { data } = await getClient({ static: true }).query<{
    productsCount: number;
  }>({
    query: productsCountQuery,
  });

  if (!data) {
    throw new Error('Products count query returned no data');
  }

  const productsCount = data.productsCount;

  return (
    <Layout>
      <main data-testid="home-page" className="flex flex-col">
        <MainHeroBanner productsCount={productsCount} />
        <Suspense fallback={<CategoryNavigationSkeleton />}>
          <CategoryNavigationSection />
        </Suspense>
        <Suspense fallback={<TrendingProductSkeleton />}>
          <TrendingProductSection />
        </Suspense>
        <Suspense fallback={<RecentProductSkeleton />}>
          <RecentProductSection />
        </Suspense>
      </main>
    </Layout>
  );
}
