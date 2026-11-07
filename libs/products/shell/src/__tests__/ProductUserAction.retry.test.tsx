import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { NextIntlClientProvider } from 'next-intl';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it } from 'vitest';
import { useProductUserAction } from '../components/ProductUserAction/useProductUserAction';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

it('투표 저장 뒤 추천 수 읽기 실패는 투표 완료를 유지하고 조회만 재시도한다', async () => {
  localStorage.clear();
  const operations: string[] = [];
  let countReads = 0;
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      operation =>
        new Observable(observer => {
          operations.push(operation.operationName ?? '');
          if (operation.operationName === 'ProductVoteCount' && ++countReads === 1) {
            observer.next({ data: { productBySlug: null } });
            observer.complete();
            return;
          }
          const product = { __typename: 'Product', id: 'p1', name: 'Notion', voteCount: 42 };
          observer.next({
            data:
              operation.operationName === 'UpvoteProductOnProductUserAction'
                ? { upvoteProduct: { __typename: 'UpvoteProductPayload', product: { ...product, voteCount: null } } }
                : {
                    productBySlug: { ...product, voteCount: operation.operationName === 'ProductVoteCount' ? 43 : 42 },
                  },
          });
          observer.complete();
        })
    ),
  });
  function Probe() {
    const action = useProductUserAction({ slug: 'notion' });
    return (
      <>
        <button onClick={action.upvoteProduct} disabled={action.voted || action.loading} data-testid="vote">
          {action.voteCount}
        </button>
        {action.voteCountUnavailable && <button onClick={action.retryVoteCount}>Retry count</button>}
        <span>{action.success ? 'vote saved' : ''}</span>
      </>
    );
  }
  const element = document.createElement('div');
  document.body.appendChild(element);
  const root = createRoot(element);
  try {
    await act(async () =>
      root.render(
        <NextIntlClientProvider locale="en" messages={{}}>
          <ApolloProvider client={client}>
            <Probe />
          </ApolloProvider>
        </NextIntlClientProvider>
      )
    );
    const vote = element.querySelector<HTMLButtonElement>('[data-testid="vote"]')!;
    expect(vote.textContent).toBe('42');
    await act(async () => {
      vote.click();
      vote.click();
    });
    expect(vote.textContent).toBe('42');
    expect(vote.disabled).toBe(true);
    expect(element.textContent).toContain('vote saved');
    expect(operations.filter(name => name.startsWith('Upvote'))).toHaveLength(1);
    await act(async () => element.querySelectorAll<HTMLButtonElement>('button')[1].click());
    expect(vote.textContent).toBe('42');
    expect(element.textContent).toContain('Retry count');
    await act(async () => element.querySelectorAll<HTMLButtonElement>('button')[1].click());
    expect(vote.textContent).toBe('43');
    expect(vote.disabled).toBe(true);
    expect(element.textContent).toContain('vote saved');
    expect(operations).toEqual([
      'ProductBySlugOnProductUserAction',
      'UpvoteProductOnProductUserAction',
      'ProductVoteCount',
      'ProductVoteCount',
    ]);
  } finally {
    await act(async () => root.unmount());
    client.stop();
    element.remove();
    localStorage.clear();
  }
});
