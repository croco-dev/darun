// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { parseAppleSearchResponse } from '../../admin/app-store-search';
import AppDetailPage from './page';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => ({
            overrideTypes: async () => ({
              error: null,
              data: {
                ...parseAppleSearchResponse({
                  results: [
                    {
                      trackId: 123456789,
                      trackName: 'Example',
                      description: '</script><script>alert(1)</script>',
                    },
                  ],
                })![0],
                id: 'test',
                tiers: { tier: 1 },
              },
            }),
          }),
        }),
      }),
    }),
  },
}));
vi.mock('@/components/MemoCard', () => ({ MemoCard: () => null }));

it('uses the collected App Store ID in both links and keeps hostile metadata inside JSON-LD', async () => {
  const markup = renderToStaticMarkup(await AppDetailPage({ params: Promise.resolve({ id: 'test' }) }));
  const container = document.createElement('div');
  container.innerHTML = markup;
  expect(container.querySelectorAll('script')).toHaveLength(1);
  const json = JSON.parse(container.querySelector('script')!.textContent!);
  const appStoreLink = container.querySelector('a[href^="https://apps.apple.com/"]');
  expect(appStoreLink?.getAttribute('href')).toBe('https://apps.apple.com/app/id123456789');
  expect(json.offers.url).toBe('https://apps.apple.com/app/id123456789');
  expect(json.description).toBe('</script><script>alert(1)</script>');
  expect(container.querySelector('h1')?.textContent).toBe('Example');
  expect(container.textContent).toContain('1티어');
});
