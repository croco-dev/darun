// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FlowExplorer } from '../features/flows/FlowExplorer';
import type { FlowExplorerState } from '../features/flows/useFlowExplorer';

vi.mock('../features/collections/SaveButton', () => ({ SaveButton: () => null }));
vi.mock('../features/product-search/ProductSearchSuggest', () => ({ ProductSearchSuggest: () => null }));

const noop = () => {};
const state: FlowExplorerState = {
  loading: false,
  error: undefined,
  queryLengthError: false,
  networkError: false,
  cards: [],
  totalCount: 2,
  hasNextPage: false,
  loadingMore: false,
  loadMoreError: false,
  searchInput: '',
  query: null,
  platform: null,
  secondary: null,
  flowType: null,
  product: null,
  onSearchInputChange: noop,
  onSearchSubmit: noop,
  onPlatformChange: noop,
  onSecondaryChange: noop,
  onFlowTypeChange: noop,
  onClearFilters: noop,
  onProductClear: noop,
  onLoadMore: noop,
  retry: noop,
  suggestions: [],
  isSearchingSuggestions: false,
  onSuggestionSelect: noop,
  onSuggestClose: noop,
  onSearchInputFocus: noop,
};

const cards: FlowExplorerState['cards'] = ['memo', 'empty'].map((slug, index) => ({
  id: `flow-${slug}`,
  title: `${slug} 검색`,
  description: '',
  platform: 'WEB',
  flowType: 'SEARCH',
  stepCount: 1,
  coverImageUrl: `/screen-${slug}.png`,
  coverImageAlt: `${slug} 화면`,
  product: { id: slug, name: slug, slug, logoUrl: index === 0 ? '/memo-logo.png' : '' },
}));

describe('플로 카드의 상품 로고', () => {
  afterEach(cleanup);
  it('실제 로고가 있는 상품만 로고를 표시하고 빈 로고 상품의 탐색 링크와 이름을 보존한다', () => {
    const container = document.createElement('div');
    container.innerHTML = renderToStaticMarkup(<FlowExplorer.ViewComponent {...state} cards={cards} />);
    const withLogo = container.querySelector('a[href="/flows/flow-memo"]');
    expect(withLogo?.querySelector('img[alt="memo 로고"]')?.getAttribute('src')).toBe('/memo-logo.png');
    const withoutLogo = container.querySelector('a[href="/flows/flow-empty"]');
    expect(withoutLogo?.textContent).toContain('empty');
    expect(withoutLogo?.querySelector('img[alt$="로고"]')).toBeNull();
    expect(withoutLogo?.querySelector('img')?.getAttribute('src')).toBe('/screen-empty.png');
  });
  it('로고 로딩 실패 뒤 주소가 바뀌면 새 로고를 다시 표시한다', () => {
    const view = render(<FlowExplorer.ViewComponent {...state} cards={cards} />);
    const logo = view.getByRole('img', { name: 'memo 로고' });
    fireEvent.error(logo);
    expect(logo.style.display).toBe('none');
    const updated = cards.map(card => ({
      ...card,
      product: { ...card.product, logoUrl: card.product.logoUrl ? '/replaced.png' : '' },
    }));
    view.rerender(<FlowExplorer.ViewComponent {...state} cards={updated} />);
    const replaced = view.getByRole('img', { name: 'memo 로고' });
    expect(replaced.getAttribute('src')).toBe('/replaced.png');
    expect(replaced.style.display).toBe('');
  });
});
