import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from '@apollo/client';
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

function createClient(responses: Response[]) {
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
    link: ApolloLink.from([productLinkSchemaCompatibility, new HttpLink({ fetch, uri: 'http://localhost/graphql' })]),
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

  it.each([{ role: 'official' }, { makePrimary: true }] as const)(
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
