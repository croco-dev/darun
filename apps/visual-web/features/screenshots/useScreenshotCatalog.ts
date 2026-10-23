'use client';

import type { ApolloClient } from '@apollo/client';
import { useApolloClient } from '@apollo/client/react';
import { VisualAppsOnCatalogDocument, type VisualAppsOnCatalogQuery } from '@darun/provider-graphql';
import { useSearchParams } from '@darun/utils-router';
import { useEffect, useState } from 'react';
import { VISUAL_APPS_PAGE_SIZE } from '../apps/documents';
import type { ScreenshotCard } from './useScreenshotExplorer';

export function groupScreenshotCatalog(cards: ScreenshotCard[]) {
  const groups = new Map<string, { product: ScreenshotCard['product']; screenshots: ScreenshotCard[] }>();
  const seen = new Set<string>();
  for (const card of cards) {
    if (!card.product.id || seen.has(card.id)) continue;
    seen.add(card.id);
    const group = groups.get(card.product.id);
    if (group) {
      group.screenshots.push(card);
    } else {
      groups.set(card.product.id, {
        product: card.product,
        screenshots: [card],
      });
    }
  }
  return [...groups.values()];
}

export async function loadScreenshotCatalog(
  client: ApolloClient,
  after: string | null = null,
  query: string | null = null,
  productSlug: string | null = null
) {
  const result = await client.query({
    query: VisualAppsOnCatalogDocument,
    variables: { first: VISUAL_APPS_PAGE_SIZE, after, query, productSlug },
    fetchPolicy: 'no-cache',
  });
  const connection = result.data?.visualApps;
  if (!connection) {
    throw new Error('App catalog response is missing');
  }
  if (connection.pageInfo.hasNextPage && (!connection.pageInfo.endCursor || connection.pageInfo.endCursor === after)) {
    throw new Error('App catalog cursor did not advance');
  }
  const apps = connection.edges.flatMap(edge => (edge?.node ? [edge.node] : []));
  const cards: ScreenshotCard[] = apps.flatMap(app =>
    (app.previewScreenshots ?? (app.coverScreenshot ? [app.coverScreenshot] : [])).map(preview => ({
      id: preview.id,
      imageUrl: preview.imageUrl,
      imageAlt: preview.imageAlt ?? '',
      title: preview.title ?? null,
      platform: preview.platform ?? null,
      screenType: preview.screenType ?? null,
      product: {
        id: app.id,
        name: app.name,
        slug: app.slug,
        logoUrl: app.logoUrl ?? '',
        summary: app.summary ?? '',
        screenshotCount: app.screenshotCount,
      },
    }))
  );
  return { cards, apps, totalCount: connection.totalCount, pageInfo: connection.pageInfo };
}

type CatalogPage = {
  cards: ScreenshotCard[];
  apps: NonNullable<VisualAppsOnCatalogQuery['visualApps']['edges'][number]['node']>[];
  totalCount: number;
  pageInfo: VisualAppsOnCatalogQuery['visualApps']['pageInfo'];
};

export function useScreenshotCatalog(query: string | null = null, productSlug: string | null = null) {
  const client = useApolloClient();
  const searchParams = useSearchParams();
  const after = searchParams.get('after');
  const [requestKey, setRequestKey] = useState(0);
  const key = JSON.stringify([after, query, productSlug, requestKey]);
  const [state, setState] = useState<{ key: string; page: CatalogPage | null; networkError: boolean }>({
    key: '',
    page: null,
    networkError: false,
  });

  useEffect(() => {
    let active = true;
    loadScreenshotCatalog(client, after, query, productSlug).then(
      page => {
        if (active) setState({ key, page, networkError: false });
      },
      () => {
        if (active) setState({ key, page: null, networkError: true });
      }
    );
    return () => {
      active = false;
    };
  }, [client, after, query, productSlug, key]);

  const current = state.key === key;
  const page = current ? state.page : null;
  return {
    cards: page?.cards ?? [],
    apps: page?.apps ?? [],
    totalCount: page?.totalCount ?? 0,
    hasNextPage: page?.pageInfo.hasNextPage ?? false,
    endCursor: page?.pageInfo.endCursor ?? null,
    isFirstPage: after === null,
    loading: !current,
    networkError: current && state.networkError,
    retry: () => setRequestKey(value => value + 1),
  };
}
