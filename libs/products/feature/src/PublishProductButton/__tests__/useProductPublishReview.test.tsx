import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { productPublishReviewSchemaCompatibility } from '../productPublishReviewSchemaCompatibility';
import { useProductPublishReview } from '../useProductPublishReview';

const missingReview = {
  message:
    'Cannot query field "adminProductPublishReview" on type "Query". Did you mean "adminProductFlow" or "adminProductFlowSummaries"?',
  extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
};

const reviewData = {
  adminProductPublishReview: {
    id: 'test',
    publishedAt: null,
    reviewToken: 'fixture-review-token',
    hasName: true,
    hasSummary: false,
    hasDescription: false,
    hasCategory: false,
    hasLogo: false,
    hasScreenshot: false,
    officialLinkStatus: 'MISSING',
    translation: null,
  },
};

function mountReview(
  status: number,
  response: unknown,
  contentType = 'application/graphql-response+json',
  reviewChanged = false
) {
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: ApolloLink.from([
      productPublishReviewSchemaCompatibility,
      new HttpLink({
        uri: '/graphql',
        fetch: async () => new Response(JSON.stringify(response), { status, headers: { 'content-type': contentType } }),
      }),
    ]),
  });
  const publishProduct = vi.fn();
  const { result } = renderHook(
    () =>
      useProductPublishReview({
        id: 'review',
        slug: 'test',
        publication: {
          isPublished: false,
          loading: false,
          publishProduct,
          reviewChanged,
          clearReviewChanged: vi.fn(),
        },
      }),
    {
      wrapper: ({ children }: { children: ReactNode }) => <ApolloProvider client={client}>{children}</ApolloProvider>,
    }
  );
  return { result, publishProduct };
}

describe('발행 준비 상태 API 배포 호환성', () => {
  it.each([
    [400, 'application/graphql-response+json'],
    [400, 'application/json'],
    [200, 'application/graphql-response+json'],
  ])('HTTP %s (%s)에서 구버전 스키마가 확인되면 관리자가 기존 발행을 선택할 수 있다', async (status, contentType) => {
    const { result, publishProduct } = mountReview(status, { errors: [missingReview] }, contentType);
    await waitFor(() => expect(result.current.legacyApi).toBe(true));
    expect(result.current.canPublish).toBe(true);
    expect(publishProduct).not.toHaveBeenCalled();

    await act(() => result.current.publish());

    expect(publishProduct).toHaveBeenCalledExactlyOnceWith({ kind: 'legacy' });
  });

  it.each([
    ['권한 오류', 200, [{ ...missingReview, extensions: { code: 'FORBIDDEN' } }]],
    ['다른 필드의 스키마 오류', 400, [{ ...missingReview, message: 'Cannot query field "id" on type "Review".' }]],
    ['HTTP 인증 실패', 401, [missingReview]],
    ['HTTP 권한 오류', 403, [missingReview]],
    ['서버 오류', 500, [missingReview]],
    ['여러 오류', 400, [missingReview, missingReview]],
  ] as const)('%s일 때 기존 발행을 허용하지 않는다', async (_label, status, errors) => {
    const { result, publishProduct } = mountReview(status, { errors });
    await waitFor(() => expect(result.current.error).toBeDefined());
    expect(result.current.legacyApi).toBe(false);
    expect(result.current.canPublish).toBe(false);

    await act(() => result.current.publish());

    expect(publishProduct).not.toHaveBeenCalled();
  });

  it('원문 변경으로 발행이 거절된 뒤에는 구버전 응답이 와도 다시 확인해야 한다', async () => {
    const { result, publishProduct } = mountReview(
      400,
      { errors: [missingReview] },
      'application/graphql-response+json',
      true
    );
    await waitFor(() => expect(result.current.error).toBeDefined());
    expect(result.current.legacyApi).toBe(false);
    expect(result.current.canPublish).toBe(false);

    await act(() => result.current.publish());

    expect(publishProduct).not.toHaveBeenCalled();
  });

  it.each([
    [200, true],
    [401, false],
    [403, false],
    [500, false],
  ])('HTTP %s의 검토 데이터가 발행을 허용하는지 확인한다', async (status, canPublish) => {
    const { result, publishProduct } = mountReview(status, {
      data: reviewData,
      errors: [{ message: 'Translation unavailable', path: ['adminProductPublishReview', 'translation'] }],
    });
    await waitFor(() => expect(result.current.error).toBeDefined());
    expect(result.current.canPublish).toBe(canPublish);

    await act(() => result.current.publish());

    if (canPublish) {
      expect(publishProduct).toHaveBeenCalledExactlyOnceWith({
        kind: 'review',
        reviewToken: 'fixture-review-token',
      });
    } else {
      expect(publishProduct).not.toHaveBeenCalled();
    }
  });

  it.each([
    [400, 'application/json'],
    [400, 'application/graphql-response+json'],
    [200, 'application/graphql-response+json'],
  ])('HTTP %s (%s)에서 검토 데이터와 스키마 오류가 함께 오면 발행을 막는다', async (status, contentType) => {
    const { result, publishProduct } = mountReview(status, { data: reviewData, errors: [missingReview] }, contentType);
    await waitFor(() => expect(result.current.error).toBeDefined());
    expect(result.current.legacyApi).toBe(false);
    expect(result.current.canPublish).toBe(false);

    await act(() => result.current.publish());

    expect(publishProduct).not.toHaveBeenCalled();
  });

  it('검토 데이터와 함께 잘못된 오류 목록이 오면 발행을 막는다', async () => {
    const { result, publishProduct } = mountReview(200, { data: reviewData, errors: [null] });
    await waitFor(() => expect(result.current.error).toBeDefined());
    expect(result.current.review).toBeUndefined();
    expect(result.current.canPublish).toBe(false);

    await act(() => result.current.publish());

    expect(publishProduct).not.toHaveBeenCalled();
  });

  it.each([undefined, null, ''])('검토 토큰이 %s이면 현행 API 응답으로 발행을 진행하지 않는다', async reviewToken => {
    const { result, publishProduct } = mountReview(200, {
      data: { adminProductPublishReview: { ...reviewData.adminProductPublishReview, reviewToken } },
    });
    await waitFor(() => expect(result.current.error).toBeDefined());
    expect(result.current.review).toBeUndefined();
    expect(result.current.canPublish).toBe(false);

    await act(() => result.current.publish());

    expect(publishProduct).not.toHaveBeenCalled();
  });

  it.each(['application/json', 'application/graphql-response+json'])(
    '%s에서 필드 실행 경로가 담긴 오류는 구버전 스키마 오류로 취급하지 않는다',
    async contentType => {
      const { result, publishProduct } = mountReview(
        400,
        { errors: [{ ...missingReview, path: ['adminProductPublishReview'] }] },
        contentType
      );
      await waitFor(() => expect(result.current.error).toBeDefined());
      expect(result.current.legacyApi).toBe(false);

      await act(() => result.current.publish());

      expect(publishProduct).not.toHaveBeenCalled();
    }
  );

  it.each([
    { reviewToken: reviewData.adminProductPublishReview.reviewToken },
    { ...reviewData.adminProductPublishReview, hasScreenshot: undefined },
    { ...reviewData.adminProductPublishReview, publishedAt: undefined },
  ])('검토 토큰이 있어도 필수 준비 상태가 누락되면 발행을 막는다', async adminProductPublishReview => {
    const { result, publishProduct } = mountReview(200, { data: { adminProductPublishReview } });
    await waitFor(() => expect(result.current.error).toBeDefined());
    expect(result.current.review).toBeUndefined();
    expect(result.current.canPublish).toBe(false);

    await act(() => result.current.publish());

    expect(publishProduct).not.toHaveBeenCalled();
  });

  it('원문 준비 상태와 번역 관찰값이 모두 있으면 발행할 수 있다', async () => {
    const data = {
      adminProductPublishReview: {
        ...reviewData.adminProductPublishReview,
        translation: {
          name: { status: 'CURRENT', sourceHash: 'source-name-hash' },
          summary: { status: 'NOT_NEEDED', sourceHash: null },
          description: { status: 'NOT_NEEDED', sourceHash: null },
          observedAt: '2026-11-27T03:00:00.000Z',
          latestJobFailed: false,
        },
      },
    };
    const { result } = mountReview(200, { data });

    await waitFor(() => expect(result.current.canPublish).toBe(true));

    expect(result.current.review?.translation).toMatchObject(data.adminProductPublishReview.translation);
  });
});
