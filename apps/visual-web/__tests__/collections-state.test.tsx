import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { Collections } from '../features/collections/Collections';
import type * as CollectionStore from '../features/collections/collectionStore';

vi.mock('../features/collections/collectionStore', async importOriginal => ({
  ...(await importOriginal<typeof CollectionStore>()),
  useCollections: () => ({ collections: [], storageError: '저장 데이터를 읽을 수 없습니다.' }),
}));

it('shows unreadable storage as an error without the empty collection browse action', () => {
  const html = renderToStaticMarkup(createElement(Collections));
  expect(html).toContain('role="alert"');
  expect(html).not.toContain('href="/"');
});
