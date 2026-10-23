import { gql } from '@apollo/client';
import { MetadataRoute } from 'next';
import { container } from './serverContainer';

// Generate at request time: an API failure must not become a cached empty catalog.
export const revalidate = 0;

export const VISUAL_SITEMAP_SIZE = 100;
const VISUAL_SITEMAP_PAGE_SIZE = 48;

const screenshotsQuery = gql`
  query VisualScreenshotsForSitemap($first: Int!, $after: String) {
    visualScreenshots(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
        }
      }
    }
  }
`;

const flowsQuery = gql`
  query VisualFlowsForSitemap($first: Int!, $after: String) {
    visualFlows(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
        }
      }
    }
  }
`;

type IdEdgeData = {
  edges: Array<{ node: { id: string } }>;
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
};

async function fetchIds(query: typeof screenshotsQuery, key: 'visualScreenshots' | 'visualFlows'): Promise<string[]> {
  const client = container.serverApolloClient;
  const ids = new Set<string>();
  const cursors = new Set<string>();
  let after: string | undefined;

  while (ids.size < VISUAL_SITEMAP_SIZE) {
    const first = Math.min(VISUAL_SITEMAP_PAGE_SIZE, VISUAL_SITEMAP_SIZE - ids.size);
    const { data } = await client.query<Record<string, IdEdgeData | undefined>>({
      query,
      variables: { first, after },
      fetchPolicy: 'no-cache',
    });
    const connection = data?.[key];
    if (
      !connection ||
      !Array.isArray(connection.edges) ||
      connection.edges.length > first ||
      typeof connection.pageInfo?.hasNextPage !== 'boolean' ||
      !(connection.pageInfo.endCursor === null || typeof connection.pageInfo.endCursor === 'string')
    ) {
      throw new Error(`Invalid ${key} sitemap response`);
    }

    const previousSize = ids.size;
    for (const edge of connection.edges) {
      if (typeof edge?.node?.id !== 'string' || !edge.node.id) {
        throw new Error(`Invalid ${key} sitemap ID`);
      }
      ids.add(edge.node.id);
    }
    if (!connection.pageInfo.hasNextPage || ids.size === VISUAL_SITEMAP_SIZE) break;

    const cursor = connection.pageInfo.endCursor;
    if (!cursor || cursors.has(cursor) || ids.size === previousSize) {
      throw new Error(`Non-progressing ${key} sitemap cursor`);
    }
    cursors.add(cursor);
    after = cursor;
  }
  return [...ids];
}

export function buildVisualSitemapEntries(screenshotIds: string[], flowIds: string[]): MetadataRoute.Sitemap {
  const base = 'https://visual.darun.io';
  return [
    { url: `${base}/`, changeFrequency: 'daily' as const, priority: 1 },
    { url: `${base}/flows`, changeFrequency: 'daily' as const, priority: 0.8 },
    { url: `${base}/apps`, changeFrequency: 'daily' as const, priority: 0.8 },
    ...screenshotIds.map(id => ({
      url: `${base}/screenshots/${id}`,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
    ...flowIds.map(id => ({
      url: `${base}/flows/${id}`,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
  ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [screenshotIds, flowIds] = await Promise.all([
    fetchIds(screenshotsQuery, 'visualScreenshots'),
    fetchIds(flowsQuery, 'visualFlows'),
  ]);
  return buildVisualSitemapEntries(screenshotIds, flowIds);
}
