// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
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
                id: 'test',
                name: 'Example',
                description: '</script><script>alert(1)</script>',
                icon_url: null,
                app_store_id: '123',
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

it('keeps hostile app metadata inside the actual JSON-LD script', async () => {
  const markup = renderToStaticMarkup(await AppDetailPage({ params: Promise.resolve({ id: 'test' }) }));
  const container = document.createElement('div');
  container.innerHTML = markup;
  expect(container.querySelectorAll('script')).toHaveLength(1);
  const json = JSON.parse(container.querySelector('script')!.textContent!);
  expect(json.description).toBe('</script><script>alert(1)</script>');
  expect(container.querySelector('h1')?.textContent).toBe('Example');
  expect(container.textContent).toContain('1티어');
});
