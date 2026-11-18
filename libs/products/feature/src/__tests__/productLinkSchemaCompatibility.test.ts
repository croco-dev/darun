import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from '@apollo/client';
import { ServerError } from '@apollo/client/errors';
import { RetryLink } from '@apollo/client/link/retry';
import {
  ProductOnProductLinksDocument,
  TempProductBySlugOnProductLinkTableDocument,
  UpdateProductLinkOnEditProductLinkItemDocument,
} from '@darun/provider-graphql';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { productLinkSchemaCompatibility } from '../productLinkSchemaCompatibility';

const missingRole = {
  message: 'Cannot query field "role" on type "Link".',
  extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
};
const link = {
  __typename: 'Link',
  id: 'visit-link',
  title: 'Website',
  link: 'https://example.com',
  displayLink: 'example.com',
  iconUrl: '',
  isPrimary: true,
};
const product = { __typename: 'Product', id: 'product', links: [link] };
const clients: ApolloClient[] = [];

afterEach(() => clients.splice(0).forEach(client => client.stop()));

function response(data: unknown, status = 200, contentType = 'application/json') {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': contentType } });
}

function createClient(responses: Response[], links: ApolloLink[] = []) {
  const requests: Array<{ operationName: string; query: string; variables: unknown }> = [];
  const fetch = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
    requests.push(JSON.parse(String(init?.body)));
    const next = responses.shift();
    if (!next) throw new Error('Unexpected replay');
    return next;
  });
  const cache = new InMemoryCache();
  const client = new ApolloClient({
    cache,
    link: ApolloLink.from([
      ...links,
      productLinkSchemaCompatibility,
      new HttpLink({ fetch, uri: 'http://localhost/graphql' }),
    ]),
  });
  clients.push(client);
  return { client, cache, requests };
}

describe('이전 GraphQL API의 상품 링크 호환성', () => {
  it.each([['application/json'], ['application/graphql-response+json']])(
    '공개 링크 조회에서 이전 API 응답 %s를 복구하고 기존 대표를 유지한다',
    async contentType => {
      const { client, requests } = createClient([
        response({ errors: [missingRole] }, 400, contentType),
        response({ data: { productBySlug: product } }),
      ]);
      const result = await client.query({
        query: ProductOnProductLinksDocument,
        variables: { slug: 'product', locale: 'en' },
      });
      expect(result.data?.productBySlug?.links).toEqual([{ ...link, role: null }]);
      expect(requests).toHaveLength(2);
      expect(requests[0].query).toMatch(/\brole\b/);
      expect(requests[1].query).not.toMatch(/\brole\b/);
      expect(requests[1].operationName).toBe(requests[0].operationName);
      expect(requests[1].variables).toEqual(requests[0].variables);
    }
  );

  it('관리자 목록과 기존 제목 저장에서는 응답 필드만 생략하고 요청 입력을 보존한다', async () => {
    const { client, cache, requests } = createClient([
      response({ errors: [missingRole] }, 400),
      response({ data: { tempProductBySlug: product } }),
      response({ errors: [missingRole] }, 400),
      response({
        data: { updateProductLink: { product: { ...product, links: [{ ...link, title: 'Updated' }] } } },
      }),
    ]);
    await client.query({ query: TempProductBySlugOnProductLinkTableDocument, variables: { slug: 'product' } });
    await client.mutate({
      mutation: UpdateProductLinkOnEditProductLinkItemDocument,
      variables: { slug: 'product', id: link.id, input: { title: 'Updated' } },
    });

    expect(requests).toHaveLength(4);
    expect(requests[3].query).not.toMatch(/\brole\b/);
    expect(requests[3].variables).toEqual(requests[2].variables);
    expect(cache.extract()['Link:visit-link']).toMatchObject({ role: null, isPrimary: true, title: 'Updated' });
  });

  it.each([{ role: 'official' }, { makePrimary: true }, { title: '' }] as const)(
    '새로운 변경 의도 %j를 이전 API로 재전송하지 않는다',
    async input => {
      const { client, requests } = createClient([response({ errors: [missingRole] }, 400)]);
      await expect(
        client.mutate({
          mutation: UpdateProductLinkOnEditProductLinkItemDocument,
          variables: { slug: 'product', id: link.id, input },
        })
      ).rejects.toThrow();
      expect(requests).toHaveLength(1);
    }
  );

  it('나중에 성공한 조회는 폴백의 전송 실패 뒤에도 새 역할을 읽는다', async () => {
    const newLink = { ...link, title: '', role: 'documentation' };
    const retry = new RetryLink({
      delay: { initial: 0, jitter: false },
      attempts: {
        max: 2,
        retryIf: (error, operation) =>
          operation.operationType === 'query' && ServerError.is(error) && error.statusCode === 503,
      },
    });
    const { client, requests } = createClient(
      [
        response({ errors: [missingRole] }, 400),
        response({}, 503),
        response({ data: { productBySlug: { ...product, links: [newLink] } } }),
      ],
      [retry]
    );
    const result = await client.query({
      query: ProductOnProductLinksDocument,
      variables: { slug: 'product', locale: 'en' },
    });
    expect(requests.map(request => /\brole\b/.test(request.query))).toEqual([true, false, true]);
    expect(result.data?.productBySlug?.links).toEqual([newLink]);
  });

  it('일반 조회 오류는 이전 API 응답으로 판단하지 않는다', async () => {
    const { client, requests } = createClient([
      response({
        errors: [{ message: 'Read temporarily unavailable', extensions: { code: 'INTERNAL_SERVER_ERROR' } }],
      }),
    ]);
    await expect(
      client.query({ query: ProductOnProductLinksDocument, variables: { slug: 'product', locale: 'ko' } })
    ).rejects.toThrow('Read temporarily unavailable');
    expect(requests).toHaveLength(1);
  });
});
