import { gql } from '@apollo/client';
import { HomeCategoryBar } from '@darun/pages-shell/src/components/HomeCategoryBar';
import {
  CategoryNavigationSection,
  MainHeroBanner,
  RecentProductSection,
  TrendingProductSection,
} from '@darun/products-shell';
import { CategoryNavigationSkeleton } from '@darun/products-shell/src/shells/CategoryNavigationSection/CategoryNavigationSkeleton';
import { RecentProductSkeleton } from '@darun/products-shell/src/shells/RecentProductSection/RecentProductSkeleton';
import { TrendingProductSkeleton } from '@darun/products-shell/src/shells/TrendingProductSection/TrendingProductSkeleton';
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

  const productsCount = data?.productsCount ?? 0;

  return (
    <main>
      <div data-testid="home-hero">
        <MainHeroBanner productsCount={productsCount} />
      </div>
      <Suspense fallback={<CategoryNavigationSkeleton />}>
        <CategoryNavigationSection />
      </Suspense>
      <Suspense fallback={null}>
        <HomeCategoryBar />
      </Suspense>
      <Suspense fallback={<TrendingProductSkeleton />}>
        <TrendingProductSection />
      </Suspense>
      <Suspense fallback={<RecentProductSkeleton />}>
        <RecentProductSection />
      </Suspense>
    </main>
  );
}
