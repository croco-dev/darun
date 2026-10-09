import { gql } from '@apollo/client';
import { MetadataRoute } from 'next';
import { container } from './serverContainer';

export const revalidate = 3600;

export const VISUAL_SITEMAP_SIZE = 100;

const screenshotsQuery = gql`
  query VisualScreenshotsForSitemap($first: Int!) {
    visualScreenshots(first: $first) {
      edges {
        node {
          id
        }
      }
    }
  }
`;

const flowsQuery = gql`
  query VisualFlowsForSitemap($first: Int!) {
    visualFlows(first: $first) {
      edges {
        node {
          id
        }
      }
    }
  }
`;

type IdEdgeData = {
  edges?: Array<{ node?: { id?: string } | null } | null> | null;
};

async function fetchIds(query: typeof screenshotsQuery, key: 'visualScreenshots' | 'visualFlows'): Promise<string[]> {
  try {
    const client = container.serverApolloClient;
    const { data } = await client.query<Record<string, IdEdgeData | undefined>>({
      query,
      variables: { first: VISUAL_SITEMAP_SIZE },
      fetchPolicy: 'no-cache',
    });
    return (data?.[key]?.edges ?? []).flatMap(edge => (edge?.node?.id ? [edge.node.id] : []));
  } catch (error) {
    console.error('Failed to fetch visual sitemap ids', error);
    return [];
  }
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
