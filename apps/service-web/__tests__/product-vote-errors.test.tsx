// @vitest-environment jsdom
import 'reflect-metadata';
import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { GraphQLError, type GraphQLFormattedError } from 'graphql';
import { NextIntlClientProvider } from 'next-intl';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { useProductUserAction } from '../../../libs/products/shell/src/components/ProductUserAction/useProductUserAction';
import { formatServerError } from '../../../libs/shared/utils-apollo-server/src/libs/createServer/formatError';
import { votingDuplicateVote, votingRateLimitExceeded } from '../../../libs/voting/domain/src/errors/VoteError';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

function publicError(error: Error): GraphQLFormattedError {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const wrapped = new GraphQLError(error.message, {
    originalError: error,
    path: ['upvoteProduct'],
  });
  return formatServerError(wrapped.toJSON(), wrapped, false);
}

async function mountVote(locale: 'ko' | 'en', mutate: () => Promise<GraphQLFormattedError[] | Error | undefined>) {
  const mutation = vi.fn(mutate);
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      operation =>
        new Observable(observer => {
          const product = {
            __typename: 'Product',
            id: operation.variables.slug,
            name: operation.variables.slug,
            voteCount: 7,
          };
          if (operation.operationName === 'UpvoteProductOnProductUserAction') {
            void mutation().then(result => {
              if (result instanceof Error) observer.error(result);
              else {
                observer.next(result ? { errors: result } : { data: { upvoteProduct: { product } } });
                observer.complete();
              }
            });
          } else {
            observer.next({ data: { productBySlug: product } });
            observer.complete();
          }
        })
    ),
  });
  function Probe({ slug }: { slug: string }) {
    const action = useProductUserAction({ slug });
    return (
      <>
        <button onClick={action.upvoteProduct} disabled={action.loading || action.voted} aria-pressed={action.voted}>
          {action.loading ? 'loading' : action.success ? 'success' : 'vote'}
        </button>
        <output>{action.error}</output>
      </>
    );
  }
  const element = document.createElement('div');
  document.body.appendChild(element);
  const root = createRoot(element);
  const render = async (slug: string) =>
    act(async () => {
      root.render(
        <NextIntlClientProvider locale={locale} messages={{}}>
          <ApolloProvider client={client}>
            <Probe slug={slug} />
          </ApolloProvider>
        </NextIntlClientProvider>
      );
    });
  await render('first');
  return {
    mutation,
    button: element.querySelector('button')!,
    output: element.querySelector('output')!,
    render,
    click: () => act(async () => element.querySelector('button')!.click()),
    dispose: async () => {
      await act(async () => root.unmount());
      client.stop();
      element.remove();
    },
  };
}

it.each([
  [
    'ko',
    '1분 내 최대 10회까지 투표할 수 있습니다.',
    '단시간에 너무 많은 투표를 시도했습니다. 잠시 후 다시 시도해주세요.',
  ],
  ['en', 'Please wait before voting again.', 'Too many vote attempts. Please try again in a minute.'],
] as const)(
  '%s에서 서버 문구와 무관하게 제한 코드를 대기 안내로 표시하고 재시도한다',
  async (locale, message, expected) => {
    const error = publicError(votingRateLimitExceeded(message));
    expect(error).toMatchObject({
      message,
      extensions: { code: 'voting/rate-limit-exceeded' },
    });
    const action = await mountVote(locale, async () => [error]);
    try {
      await action.click();
      expect(action.output.textContent).toBe(expected);
      expect(action.button.disabled).toBe(false);
      expect(action.button.getAttribute('aria-pressed')).toBe('false');
      expect(localStorage.getItem('darun-voted-products')).toBeNull();
      action.mutation.mockResolvedValueOnce(undefined);
      await action.click();
      expect(action.output.textContent).toBe('');
      expect(action.button.textContent).toBe('success');
      expect(action.button.disabled).toBe(true);
      expect(JSON.parse(localStorage.getItem('darun-voted-products')!)).toEqual(['first']);
    } finally {
      await action.dispose();
    }
  }
);

it.each([
  ['ko', '이미 투표한 서비스입니다.'],
  ['en', 'You have already voted for this product.'],
] as const)('%s에서 중복 코드는 투표 상태를 보존하며 성공으로 알리지 않는다', async (locale, expected) => {
  const duplicate = {
    ...publicError(votingDuplicateVote()),
    message: '이미 처리한 투표입니다.',
  };
  const action = await mountVote(locale, async () => [{ message: 'Other field error' }, duplicate]);
  try {
    await action.click();
    expect(action.output.textContent).toBe(expected);
    expect(action.button.getAttribute('aria-pressed')).toBe('true');
    expect(action.button.disabled).toBe(true);
    expect(action.button.textContent).toBe('vote');
    expect(JSON.parse(localStorage.getItem('darun-voted-products')!)).toEqual(['first']);
    await action.click();
    expect(action.mutation).toHaveBeenCalledTimes(1);
  } finally {
    await action.dispose();
  }
});

it.each([
  new Error('network: duplicate-vote rate-limit-exceeded'),
  [
    {
      message: 'duplicate-vote rate-limit-exceeded',
      extensions: { code: 'UNKNOWN' },
    },
  ],
])('통신 실패와 알려지지 않은 코드는 메시지에 투표 코드가 있어도 일반 실패로 남긴다', async result => {
  const action = await mountVote('en', async () => result);
  try {
    await action.click();
    expect(action.output.textContent).toBe('Failed to vote. Please try again.');
    expect(action.button.disabled).toBe(false);
    expect(action.button.getAttribute('aria-pressed')).toBe('false');
    expect(localStorage.getItem('darun-voted-products')).toBeNull();
  } finally {
    await action.dispose();
  }
});

it('이전 상품의 늦은 중복 응답은 현재 상품의 상태와 안내를 바꾸지 않는다', async () => {
  const pending = Promise.withResolvers<GraphQLFormattedError[]>();
  const action = await mountVote('ko', () => pending.promise);
  try {
    await action.click();
    expect(action.button.disabled).toBe(true);
    await action.render('second');
    await act(async () =>
      pending.resolve([
        {
          message: '처리된 투표',
          extensions: { code: 'voting/duplicate-vote' },
        },
      ])
    );
    expect(action.output.textContent).toBe('');
    expect(action.button.disabled).toBe(false);
    expect(action.button.getAttribute('aria-pressed')).toBe('false');
    expect(action.button.textContent).toBe('vote');
    expect(JSON.parse(localStorage.getItem('darun-voted-products')!)).toEqual(['first']);
  } finally {
    await action.dispose();
  }
});
