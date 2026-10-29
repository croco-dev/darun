import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EditProductDescription } from '../EditProductDescription';

vi.mock('@darun/utils-image-upload', () => ({
  useImageUpload: () => ({ upload: vi.fn() }),
}));
vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));

afterEach(cleanup);

describe('실제 설명 편집기와 저장 폼', () => {
  it('문장만 수정해 저장하고 다시 열어도 병합 셀과 기존 서식을 보존한다', async () => {
    let stored =
      '<h2>요금 안내</h2><p>기존 소개</p>' +
      '<table><tr><th rowspan="2">플랜</th><th colspan="2">가격</th></tr>' +
      '<tr><th>월간</th><th>연간</th></tr>' +
      '<tr><td>Basic</td><td>1000원</td><td>11000원</td></tr></table>' +
      '<ul><li>무료 체험</li></ul><blockquote><p>조건 확인</p></blockquote>' +
      '<p><a href="https://example.com/plans">공식 안내</a></p>' +
      '<img src="https://example.com/plan.png" alt="가격 안내 화면">';
    const writes: string[] = [];
    let completeSave: (() => void) | undefined;
    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: new ApolloLink(
        operation =>
          new Observable(observer => {
            const product = () => ({
              __typename: 'Product',
              id: 'product-table',
              description: stored,
            });
            if (operation.operationName === 'EditProductOnEditProductDescription') {
              writes.push(operation.variables.input.description);
              completeSave = () => {
                stored = operation.variables.input.description;
                observer.next({
                  data: {
                    editProduct: {
                      __typename: 'EditProductPayload',
                      product: product(),
                    },
                  },
                });
                observer.complete();
              };
              return;
            }
            observer.next({ data: { tempProductBySlug: product() } });
            observer.complete();
          })
      ),
    });
    const mount = () =>
      render(
        <ApolloProvider client={client}>
          <EditProductDescription slug="table-product" />
        </ApolloProvider>
      );
    const view = mount();
    try {
      await waitFor(() => expect(view.container.querySelector('td')?.textContent).toBe('Basic'));
      const paragraph = view.container.querySelector('.ProseMirror > p')!;
      await act(async () => {
        paragraph.textContent = '수정한 소개';
        fireEvent.input(paragraph, { inputType: 'insertText' });
      });
      fireEvent.click(screen.getByRole('button', { name: '저장' }));
      await waitFor(() => expect(writes).toHaveLength(1));
      await waitFor(() =>
        expect(view.container.querySelector('.ProseMirror')?.getAttribute('contenteditable')).toBe('false')
      );
      expect([...view.container.querySelectorAll('button')].every(button => button.disabled)).toBe(true);
      await act(async () => completeSave?.());
      await waitFor(() => expect(screen.getByRole('button', { name: '저장' }).hasAttribute('disabled')).toBe(false));
      view.unmount();
      const reopened = mount();
      await waitFor(() => expect(reopened.container.querySelector('.ProseMirror table')).not.toBeNull());
      const document = reopened.container.querySelector('.ProseMirror')!;
      expect(document.querySelector(':scope > p')?.textContent).toBe('수정한 소개');
      expect(
        [...document.querySelectorAll('tr')].map(row =>
          [...row.cells].map(cell => `${cell.tagName}:${cell.textContent}:${cell.rowSpan}:${cell.colSpan}`)
        )
      ).toEqual([
        ['TH:플랜:2:1', 'TH:가격:1:2'],
        ['TH:월간:1:1', 'TH:연간:1:1'],
        ['TD:Basic:1:1', 'TD:1000원:1:1', 'TD:11000원:1:1'],
      ]);
      expect(document.querySelector('h2')?.textContent).toBe('요금 안내');
      expect(document.querySelector('ul li')?.textContent).toBe('무료 체험');
      expect(document.querySelector('blockquote')?.textContent).toBe('조건 확인');
      expect(document.querySelector('a')?.getAttribute('href')).toBe('https://example.com/plans');
      expect(document.querySelector('img')?.getAttribute('alt')).toBe('가격 안내 화면');
      expect(document.querySelector('img')?.getAttribute('src')).toBe('https://example.com/plan.png');
      expect(new DOMParser().parseFromString(writes[0], 'text/html').querySelectorAll('table')).toHaveLength(1);
    } finally {
      client.stop();
    }
  });
});
