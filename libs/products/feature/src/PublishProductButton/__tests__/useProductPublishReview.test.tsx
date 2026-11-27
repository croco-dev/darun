import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useProductPublishReview } from '../useProductPublishReview';

const missingReview = {
  message:
    'Cannot query field "adminProductPublishReview" on type "Query". Did you mean "adminProductFlow" or "adminProductFlowSummaries"?',
  extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
};

function mountReview(status: number, errors: Array<{ message: string; extensions: { code: string } }>) {
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new HttpLink({
      uri: '/graphql',
      fetch: async () => new Response(JSON.stringify({ errors }), { status }),
    }),
  });
  const publishProduct = vi.fn();
  const { result } = renderHook(
    () => useProductPublishReview({ id: 'review', slug: 'test', publishing: false, publishProduct }),
    {
      wrapper: ({ children }: { children: ReactNode }) => <ApolloProvider client={client}>{children}</ApolloProvider>,
    }
  );
  return { result, publishProduct };
}

describe('발행 준비 상태 API 배포 호환성', () => {
  it.each([400, 200])('HTTP %s에서 구버전 스키마가 확인되면 관리자가 기존 발행을 선택할 수 있다', async status => {
    const { result, publishProduct } = mountReview(status, [missingReview]);
    await waitFor(() => expect(result.current.legacyApi).toBe(true));
    expect(result.current.canPublish).toBe(true);
    expect(publishProduct).not.toHaveBeenCalled();

    await act(() => result.current.publish());

    expect(publishProduct).toHaveBeenCalledExactlyOnceWith(undefined);
  });

  it.each([
    ['권한 오류', 200, [{ ...missingReview, extensions: { code: 'FORBIDDEN' } }]],
    ['다른 필드의 스키마 오류', 400, [{ ...missingReview, message: 'Cannot query field "id" on type "Review".' }]],
    ['서버 오류', 500, [missingReview]],
    ['여러 오류', 400, [missingReview, missingReview]],
  ] as const)('%s일 때 기존 발행을 허용하지 않는다', async (_label, status, errors) => {
    const { result, publishProduct } = mountReview(status, [...errors]);
    await waitFor(() => expect(result.current.error).toBeDefined());
    expect(result.current.legacyApi).toBe(false);
    expect(result.current.canPublish).toBe(false);

    await act(() => result.current.publish());

    expect(publishProduct).not.toHaveBeenCalled();
  });
});
