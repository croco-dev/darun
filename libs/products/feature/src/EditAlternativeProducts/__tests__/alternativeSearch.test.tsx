import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { notifications } from '@mantine/notifications';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EditAlternativeProducts } from '../EditAlternativeProducts';

vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));

const searchError = { message: '검색 중 오류가 발생했습니다.', color: 'red' };
const clients: ApolloClient[] = [];

function renderEditor() {
  const pending = new Map<
    string,
    {
      succeed(name: string): void;
      failNetwork: () => void;
      failGraphQL: () => void;
      unsubscribe: ReturnType<typeof vi.fn>;
    }
  >();
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      operation =>
        new Observable(observer => {
          if (operation.operationName === 'TempProductBySlugOnEditAlternativeProducts') {
            observer.next({
              data: {
                tempProductBySlug: {
                  __typename: 'Product',
                  id: 'source',
                  manualAlternatives: [{ __typename: 'Product', id: 'saved', name: '기존 선택' }],
                },
              },
            });
            observer.complete();
            return;
          }
          expect(operation.operationName).toBe('SearchProductsOnEditAlternativeProducts');
          const query = operation.variables.query as string;
          const unsubscribe = vi.fn();
          pending.set(query, {
            succeed(name) {
              observer.next({
                data: {
                  searchProducts: [{ __typename: 'Product', id: query, name }],
                },
              });
              observer.complete();
            },
            failNetwork() {
              observer.error(new DOMException('Current transport aborted', 'AbortError'));
            },
            failGraphQL() {
              observer.next({ errors: [{ message: 'Search unavailable' }] });
              observer.complete();
            },
            unsubscribe,
          });
          return unsubscribe;
        })
    ),
  });
  clients.push(client);
  const view = render(
    <ApolloProvider client={client}>
      <EditAlternativeProducts slug="source" />
    </ApolloProvider>
  );
  return {
    unmount: view.unmount,
    search: (query: string) =>
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: query },
      }),
    request: (query: string) => pending.get(query)!,
    hasRequest: (query: string) => pending.has(query),
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  clients.forEach(client => client.stop());
  clients.length = 0;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('대안 편집의 Apollo 검색', () => {
  it('300ms throttle 뒤 새 검색으로 교체하면 최신 결과와 기존 선택만 표시한다', async () => {
    const editor = renderEditor();
    await act(async () => vi.advanceTimersByTimeAsync(0));
    editor.search('a');
    editor.search('ab');
    await act(async () => vi.advanceTimersByTimeAsync(299));
    expect(editor.hasRequest('ab')).toBe(false);
    await act(async () => vi.advanceTimersByTimeAsync(1));
    await act(async () => editor.request('ab').succeed('최신 결과'));
    expect(editor.request('a').unsubscribe).toHaveBeenCalledOnce();

    await act(async () => editor.request('a').succeed('이전 결과'));
    expect(screen.queryByRole('option', { name: '이전 결과' })).toBeNull();
    expect(screen.getByRole('option', { name: '최신 결과' })).toBeTruthy();
    expect(screen.getByRole<HTMLOptionElement>('option', { name: '기존 선택' }).selected).toBe(true);
    expect(notifications.show).not.toHaveBeenCalled();
  });

  it('편집기가 사라지면 진행 중인 검색을 조용히 취소하고 예약된 검색을 실행하지 않는다', async () => {
    const editor = renderEditor();
    await act(async () => vi.advanceTimersByTimeAsync(0));
    editor.search('a');
    editor.search('ab');
    editor.unmount();
    await act(async () => vi.advanceTimersByTimeAsync(300));

    expect(editor.request('a').unsubscribe).toHaveBeenCalledOnce();
    expect(editor.hasRequest('ab')).toBe(false);
    expect(notifications.show).not.toHaveBeenCalled();
  });

  it.each(['failNetwork', 'failGraphQL'] as const)('현재 검색의 %s를 알리고 다음 검색을 표시한다', async fail => {
    const editor = renderEditor();
    await act(async () => vi.advanceTimersByTimeAsync(0));
    editor.search('failed');
    await act(async () => editor.request('failed')[fail]());
    expect(notifications.show).toHaveBeenCalledExactlyOnceWith(searchError);

    editor.search('recovered');
    await act(async () => vi.advanceTimersByTimeAsync(300));
    await act(async () => editor.request('recovered').succeed('복구된 결과'));
    expect(screen.getByRole('option', { name: '복구된 결과' })).toBeTruthy();
    expect(notifications.show).toHaveBeenCalledTimes(1);
  });
});
