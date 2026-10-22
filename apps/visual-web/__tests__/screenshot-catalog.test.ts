import type { ApolloClient } from '@apollo/client';
import { describe, expect, it, vi, type Mock } from 'vitest';
import { groupScreenshotCatalog, loadScreenshotCatalog } from '../features/screenshots/useScreenshotCatalog';
import type { ScreenshotCard } from '../features/screenshots/useScreenshotExplorer';

function screenshot(id: string, productId: string, name = productId): ScreenshotCard {
  return {
    id,
    title: id,
    imageUrl: `https://example.com/${id}.png`,
    imageAlt: id,
    platform: null,
    screenType: null,
    product: { id: productId, name, slug: productId, logoUrl: '', summary: '' },
  };
}

function page(nodes: ScreenshotCard[], cursor: string | null, hasNextPage: boolean) {
  return {
    data: {
      visualScreenshots: {
        edges: nodes.map(node => ({ node })),
        pageInfo: { endCursor: cursor, hasNextPage },
      },
    },
  };
}

function client(query: Mock) {
  return { query } as unknown as ApolloClient;
}

describe('screenshot-backed app catalog', () => {
  it('retains every screen across cursor pages and groups distinct product identities', async () => {
    const query = vi.fn(async ({ variables }: { variables: { after: string | null } }) => {
      if (variables.after === null) {
        return page([screenshot('newest-a', 'a', '같은 이름'), screenshot('older-a', 'a')], 'page-2', true);
      }
      if (variables.after === 'page-2') {
        return page([screenshot('oldest-a', 'a'), screenshot('newest-b', 'b', '같은 이름')], 'page-3', true);
      }
      if (variables.after === 'page-3') {
        return page([screenshot('newest-c', 'c'), screenshot('older-b', 'b')], null, false);
      }
      throw new Error('Unexpected cursor');
    });
    const cards = await loadScreenshotCatalog(client(query));
    expect(cards.map(card => card.id)).toEqual(['newest-a', 'older-a', 'oldest-a', 'newest-b', 'newest-c', 'older-b']);
    expect(
      groupScreenshotCatalog(cards).map(group => [group.product.id, group.screenshots.map(card => card.id)])
    ).toEqual([
      ['a', ['newest-a', 'older-a', 'oldest-a']],
      ['b', ['newest-b', 'older-b']],
      ['c', ['newest-c']],
    ]);
  });

  it('deduplicates repeated screenshot edges while preserving preview order', () => {
    const newest = screenshot('newest', 'app');
    const groups = groupScreenshotCatalog([
      newest,
      newest,
      screenshot('older', 'app'),
      screenshot('third', 'app'),
      screenshot('fourth', 'app'),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].screenshots).toHaveLength(4);
    expect(groups[0].screenshots.slice(0, 3).map(card => card.id)).toEqual(['newest', 'older', 'third']);
  });

  it('does not report a partial app list as complete when a later page fails', async () => {
    const query = vi.fn(async ({ variables }: { variables: { after: string | null } }) => {
      if (variables.after === null) {
        return page([screenshot('screen-a', 'a')], 'page-2', true);
      }
      throw new Error('Second page unavailable');
    });
    await expect(loadScreenshotCatalog(client(query))).rejects.toThrow('Second page unavailable');
  });

  it('fails honestly instead of looping when the API repeats a cursor', async () => {
    const query = vi.fn().mockResolvedValue(page([screenshot('screen-a', 'a')], 'repeated', true));
    await expect(loadScreenshotCatalog(client(query))).rejects.toThrow('Screenshot catalog cursor did not advance');
  });
});
