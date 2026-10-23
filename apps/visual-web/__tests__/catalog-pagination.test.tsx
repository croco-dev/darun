import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CatalogPagination } from '../features/apps/CatalogPagination';
import { buildExplorerUrl } from '../features/explorer/useExplorerQuery';

describe('native catalog page navigation', () => {
  it('keeps filtered next-page destinations and exposes first-page recovery without a load-more button', () => {
    const html = renderToStaticMarkup(
      <CatalogPagination
        firstHref="/?platform=WEB&screenType=HOME"
        nextHref="/?platform=WEB&screenType=HOME&after=next"
        isFirstPage={false}
      />
    );
    expect(html).toContain('aria-label="결과 페이지"');
    expect(html).toContain('href="/?platform=WEB&amp;screenType=HOME&amp;after=next"');
    expect(html).toContain('첫 페이지');
    expect(html).toContain('다음 페이지');
    expect(html).not.toContain('<button');
  });

  it('does not offer nonexistent pages at the end of a single-page catalogue', () => {
    const html = renderToStaticMarkup(<CatalogPagination firstHref="/apps" nextHref={null} isFirstPage />);
    expect(html).not.toContain('<a ');
  });

  it.each([
    ['/', { query: 'search', platform: 'WEB', secondary: 'HOME', element: 'BUTTON', product: 'app-a' }],
    ['/apps', { query: 'search', platform: null, secondary: null, element: null, product: 'app-a' }],
  ])('retains a cursor-free recovery link on %s page errors', (basePath, filters) => {
    const firstHref = buildExplorerUrl(basePath, filters, 'screenType', {});
    const html = renderToStaticMarkup(
      <CatalogPagination
        firstHref={firstHref}
        nextHref={`${firstHref}&after=invalid`}
        isFirstPage={false}
        networkError
      />
    );
    const links = [...html.matchAll(/href="([^"]+)"/g)].map(match => match[1].replaceAll('&amp;', '&'));
    expect(links).toEqual([firstHref]);
    const recovery = new URL(links[0], 'https://visual.example');
    expect(recovery.pathname).toBe(basePath);
    expect(recovery.searchParams.has('after')).toBe(false);
    expect(recovery.searchParams.get('q')).toBe(filters.query);
    expect(recovery.searchParams.get('product')).toBe(filters.product);
    expect(recovery.searchParams.get('platform')).toBe(filters.platform);
    expect(recovery.searchParams.get('screenType')).toBe(filters.secondary);
    expect(recovery.searchParams.get('element')).toBe(filters.element);
  });
});
