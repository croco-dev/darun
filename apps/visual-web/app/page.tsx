import { gql } from '@apollo/client';
import { Metadata } from 'next';
import { cache } from 'react';
import { TrendingStrip } from '../features/discover/TrendingStrip';
import { CategoryCards, VisualHomeHero } from '../features/discover/VisualHomeHero';
import { ScreenshotExplorer } from '../features/screenshots';
import { container } from './serverContainer';
import { VisualLayout } from './VisualLayout';

const trendingQuery = gql`
  query VisualHomeTrending {
    visualScreenshots(first: 8, after: null) {
      edges {
        node {
          id
          imageUrl
          imageAlt
          title
          product {
            id
            name
            slug
          }
        }
      }
    }
  }
`;

type TrendingData = {
  visualScreenshots?: {
    edges?: Array<{
      node?: {
        id?: string;
        imageUrl?: string;
        imageAlt?: string;
        title?: string | null;
        product?: { id?: string; name?: string; slug?: string } | null;
      } | null;
    } | null> | null;
  } | null;
};

type TrendingEdge = NonNullable<NonNullable<TrendingData['visualScreenshots']>['edges']>[number];

export type TrendingItem = {
  id: string;
  imageUrl: string;
  imageAlt: string;
  title: string | null;
  productName: string;
};

const getTrending = cache(async (): Promise<TrendingItem[]> => {
  try {
    const client = container.serverApolloClient;
    const { data } = await client.query<TrendingData>({ query: trendingQuery });
    return (data?.visualScreenshots?.edges ?? []).flatMap((edge: TrendingEdge) => {
      const node = edge?.node;
      if (!node?.id || !node.imageUrl || !node.product?.name) {
        return [];
      }
      return [
        {
          id: node.id,
          imageUrl: node.imageUrl,
          imageAlt: node.imageAlt ?? '',
          title: node.title ?? null,
          productName: node.product.name,
        },
      ];
    });
  } catch (error) {
    console.error('Failed to load trending screenshots', error);
    return [];
  }
});

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const screenTypeParam = params['screenType'];
  const screenType = typeof screenTypeParam === 'string' ? screenTypeParam : null;
  if (screenType === null) {
    return {};
  }
  return {
    title: `${screenType} 화면 모음 — 다른 Visual`,
    description: `한국 서비스의 ${screenType} 화면을 다른 Visual에서 모아보세요.`,
  };
}

export default async function Page({ searchParams }: Props) {
  const params = await searchParams;
  const hasActiveFilter = ['q', 'platform', 'screenType', 'product'].some(key => {
    const value = params[key];
    return typeof value === 'string' && value.trim().length > 0;
  });
  const trending = hasActiveFilter ? [] : await getTrending();

  return (
    <VisualLayout>
      <main id="main-content" className="w-full py-8 md:py-12">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 md:gap-12 md:px-6">
          {!hasActiveFilter && (
            <>
              <VisualHomeHero />
              <CategoryCards />
              <TrendingStrip items={trending} />
            </>
          )}
          <ScreenshotExplorer hideHero />
        </div>
      </main>
    </VisualLayout>
  );
}
