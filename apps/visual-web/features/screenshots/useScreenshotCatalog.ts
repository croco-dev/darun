'use client';

import type { ApolloClient } from '@apollo/client';
import { useApolloClient } from '@apollo/client/react';
import { VisualScreenshotsOnExplorerDocument, type VisualScreenshotsOnExplorerQuery } from '@darun/provider-graphql';
import { useEffect, useState } from 'react';
import { mapEdgeToCard, type ScreenshotCard } from './useScreenshotExplorer';

export function representativeScreenshots(cards: ScreenshotCard[]): ScreenshotCard[] {
  const seen = new Set<string>();
  return cards.filter(card => {
    if (!card.product.id || seen.has(card.product.id)) {
      return false;
    }
    seen.add(card.product.id);
    return true;
  });
}

export async function loadScreenshotCatalog(client: ApolloClient): Promise<ScreenshotCard[]> {
  const cards: ScreenshotCard[] = [];
  const cursors = new Set<string>();
  let after: string | null = null;
  // ponytail: metadata scan is O(screenshots); use an API grouped by product when the catalog grows.
  for (;;) {
    const result: { data?: VisualScreenshotsOnExplorerQuery } = await client.query({
      query: VisualScreenshotsOnExplorerDocument,
      variables: { first: 48, after, query: null, platform: null, screenType: null, productSlug: null },
    });
    const connection = result.data?.visualScreenshots;
    if (!connection) {
      throw new Error('Screenshot catalog response is missing');
    }
    for (const edge of connection.edges) {
      const card = edge?.node ? mapEdgeToCard(edge.node) : null;
      if (card) {
        cards.push(card);
      }
    }
    if (!connection.pageInfo.hasNextPage) {
      return representativeScreenshots(cards);
    }
    const cursor = connection.pageInfo.endCursor;
    if (!cursor || cursors.has(cursor)) {
      throw new Error('Screenshot catalog cursor did not advance');
    }
    cursors.add(cursor);
    after = cursor;
  }
}

export function useScreenshotCatalog(enabled = true) {
  const client = useApolloClient();
  const [requestKey, setRequestKey] = useState(0);
  const [state, setState] = useState<{
    cards: ScreenshotCard[];
    loading: boolean;
    networkError: boolean;
  }>({ cards: [], loading: true, networkError: false });

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading changes when the catalog is enabled or retried.
    setState({ cards: [], loading: true, networkError: false });
    loadScreenshotCatalog(client).then(
      cards => {
        if (active) {
          setState({ cards, loading: false, networkError: false });
        }
      },
      () => {
        if (active) {
          setState({ cards: [], loading: false, networkError: true });
        }
      }
    );
    return () => {
      active = false;
    };
  }, [client, enabled, requestKey]);

  return { ...state, retry: () => setRequestKey(key => key + 1) };
}
