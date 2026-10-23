import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { useApolloClient, useLazyQuery, useMutation } from '@apollo/client/react';
import { ApplyProductDescriptionCandidateDocument } from '@darun/provider-graphql';
import { notifications } from '@mantine/notifications';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@apollo/client/react', async importOriginal => {
  const actual = await importOriginal();
  return {
    ...(actual as Record<string, unknown>),
    useMutation: vi.fn(),
    useLazyQuery: vi.fn(),
    useApolloClient: vi.fn(),
  };
});

vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
    hide: vi.fn(),
  },
}));

import { useGenerateProductDescriptionButton } from '../useGenerateProductDescriptionButton';

describe('useGenerateProductDescriptionButton', () => {
  const defaultSlug = 'test-product';
  let generateMutateFn: ReturnType<typeof vi.fn>;
  let applyMutateFn: ReturnType<typeof vi.fn>;
  let lazyQueryFn: ReturnType<typeof vi.fn>;
  let refetchQueriesFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    generateMutateFn = vi.fn();
    applyMutateFn = vi.fn();
    lazyQueryFn = vi.fn();
    refetchQueriesFn = vi.fn().mockResolvedValue([]);

    vi.mocked(useApolloClient).mockReturnValue({
      refetchQueries: refetchQueriesFn,
    } as unknown as ReturnType<typeof useApolloClient>);

    vi.mocked(useMutation).mockImplementation((document: unknown) => {
      if (document === ApplyProductDescriptionCandidateDocument) {
        return [applyMutateFn, { loading: false }] as unknown as ReturnType<typeof useMutation>;
      }
      return [generateMutateFn, { loading: false }] as unknown as ReturnType<typeof useMutation>;
    });

    vi.mocked(useLazyQuery).mockReturnValue([lazyQueryFn, { loading: false }] as unknown as ReturnType<
      typeof useLazyQuery
    >);
  });

  it('calls generateProductDescription mutation with slug and opens preview on immediate completion', async () => {
    const { result } = renderHook(() => useGenerateProductDescriptionButton(defaultSlug));

    generateMutateFn.mockResolvedValueOnce({
      data: {
        generateProductDescription: {
          product: { id: 'prod-1', name: 'Test', description: null },
          job: {
            id: 'job-1',
            productId: 'prod-1',
            status: 'completed',
            message: 'AI 소개를 생성했어요.',
            candidateHtml: '<p>후보 설명</p>',
          },
        },
      },
    });

    await act(async () => {
      await result.current.handleGenerate();
    });

    expect(generateMutateFn).toHaveBeenCalledWith({
      variables: {
        input: { slug: defaultSlug },
      },
      context: {
        timeout: 25000,
      },
    });

    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'AI 소개 초안 생성 완료',
        color: 'teal',
      })
    );
    expect(result.current.candidateJob).toEqual({
      id: 'job-1',
      productId: 'prod-1',
      status: 'completed',
      appliedAt: null,
      candidateHtml: '<p>후보 설명</p>',
      message: 'AI 소개를 생성했어요.',
    });
    expect(result.current.isPreviewOpen).toBe(true);
    expect(refetchQueriesFn).not.toHaveBeenCalled();
  });

  it('handles immediate failure when job status is failed', async () => {
    const { result } = renderHook(() => useGenerateProductDescriptionButton(defaultSlug));

    generateMutateFn.mockResolvedValueOnce({
      data: {
        generateProductDescription: {
          product: { id: 'prod-1', name: 'Test', description: null },
          job: {
            id: 'job-1',
            productId: 'prod-1',
            status: 'failed',
            message: 'OpenAI API quota exceeded',
          },
        },
      },
    });

    await act(async () => {
      await result.current.handleGenerate();
    });

    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '생성 실패',
        message: 'OpenAI API quota exceeded',
        color: 'red',
      })
    );
    expect(result.current.isGenerating).toBe(false);
    expect(result.current.candidateJob).toBeNull();
    expect(result.current.isPreviewOpen).toBe(false);
  });

  it('handles mutation error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useGenerateProductDescriptionButton(defaultSlug));

    generateMutateFn.mockRejectedValueOnce(new Error('Network error'));

    await act(async () => {
      await result.current.handleGenerate();
    });

    expect(notifications.hide).toHaveBeenCalledWith(`generating-description-${defaultSlug}`);
    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '생성 실패',
        message: 'Network error',
        color: 'red',
      })
    );
    expect(consoleSpy).toHaveBeenCalledWith('generate description failed:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('prevents rapid double-clicks synchronously via ref guard', async () => {
    let resolveMutation: (val: unknown) => void = () => {};
    generateMutateFn.mockReturnValue(
      new Promise(resolve => {
        resolveMutation = resolve;
      })
    );

    const { result } = renderHook(() => useGenerateProductDescriptionButton(defaultSlug));

    let firstPromise: Promise<void>;
    let secondPromise: Promise<void>;
    act(() => {
      firstPromise = result.current.handleGenerate();
      secondPromise = result.current.handleGenerate();
    });

    expect(generateMutateFn).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveMutation({
        data: {
          generateProductDescription: {
            product: { id: 'prod-1' },
            job: { status: 'completed', id: 'job-1', candidateHtml: '<p>test</p>' },
          },
        },
      });
      await firstPromise;
      await secondPromise;
    });

    expect(result.current.isGenerating).toBe(false);
  });

  it('handles client timeout gracefully when mutation hangs', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.useFakeTimers();
    generateMutateFn.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useGenerateProductDescriptionButton(defaultSlug));

    let generatePromise: Promise<void>;
    act(() => {
      generatePromise = result.current.handleGenerate();
    });

    expect(result.current.isGenerating).toBe(true);

    // 1ms before timeout: still pending
    await act(async () => {
      vi.advanceTimersByTime(24_999);
    });
    expect(result.current.isGenerating).toBe(true);

    // Exactly at timeout
    await act(async () => {
      vi.advanceTimersByTime(1);
      await generatePromise;
    });

    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '생성 실패',
        message: '소개 생성 요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.',
        color: 'red',
      })
    );
    expect(result.current.isGenerating).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
    consoleSpy.mockRestore();
  });

  it('polls job status when initial status is pending and opens preview when completed', async () => {
    vi.useFakeTimers();
    generateMutateFn.mockResolvedValueOnce({
      data: {
        generateProductDescription: {
          product: { id: 'prod-1', name: 'Test', description: null },
          job: {
            id: 'job-123',
            productId: 'prod-1',
            status: 'pending',
            message: '대기 중',
          },
        },
      },
    });

    lazyQueryFn.mockResolvedValueOnce({
      data: {
        productDescriptionJob: {
          id: 'job-123',
          status: 'completed',
          message: 'AI 소개를 생성했어요.',
          candidateHtml: '<p>폴링 완료 설명</p>',
        },
      },
    });

    const { result } = renderHook(() => useGenerateProductDescriptionButton(defaultSlug));

    let generatePromise: Promise<void>;
    act(() => {
      generatePromise = result.current.handleGenerate();
    });

    // Advance by poll interval (2000ms)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
      await generatePromise;
    });

    expect(lazyQueryFn).toHaveBeenCalledWith({
      variables: { id: 'job-123', slug: defaultSlug },
    });

    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'AI 소개 초안 생성 완료',
        color: 'teal',
      })
    );
    expect(result.current.candidateJob).toEqual({
      id: 'job-123',
      productId: null,
      status: 'completed',
      appliedAt: null,
      candidateHtml: '<p>폴링 완료 설명</p>',
      message: 'AI 소개를 생성했어요.',
    });
    expect(result.current.isPreviewOpen).toBe(true);
    expect(result.current.isGenerating).toBe(false);
    vi.useRealTimers();
  });

  it('applies candidate successfully and refetches product queries', async () => {
    generateMutateFn.mockResolvedValueOnce({
      data: {
        generateProductDescription: {
          product: { id: 'prod-1', name: 'Test', description: null },
          job: {
            id: 'job-apply',
            productId: 'prod-1',
            status: 'completed',
            candidateHtml: '<p>적용할 내용</p>',
          },
        },
      },
    });

    applyMutateFn.mockResolvedValueOnce({
      data: {
        applyProductDescriptionCandidate: {
          product: { id: 'prod-1', name: 'Test', description: '<p>적용할 내용</p>' },
          job: {
            id: 'job-apply',
            productId: 'prod-1',
            status: 'completed',
            appliedAt: new Date().toISOString(),
          },
        },
      },
    });

    const { result } = renderHook(() => useGenerateProductDescriptionButton(defaultSlug));

    await act(async () => {
      await result.current.handleGenerate();
    });

    expect(result.current.isPreviewOpen).toBe(true);
    expect(result.current.candidateJob?.id).toBe('job-apply');

    await act(async () => {
      await result.current.handleApply();
    });

    expect(applyMutateFn).toHaveBeenCalledWith({
      variables: { jobId: 'job-apply' },
    });
    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '적용 완료',
        color: 'teal',
      })
    );
    expect(result.current.isPreviewOpen).toBe(false);
    expect(result.current.candidateJob).toBeNull();
    expect(refetchQueriesFn).toHaveBeenCalled();
  });

  it('handles error when applying candidate fails', async () => {
    generateMutateFn.mockResolvedValueOnce({
      data: {
        generateProductDescription: {
          product: { id: 'prod-1', name: 'Test', description: null },
          job: {
            id: 'job-stale',
            productId: 'prod-1',
            status: 'completed',
            candidateHtml: '<p>stale candidate</p>',
          },
        },
      },
    });

    applyMutateFn.mockRejectedValueOnce(
      new CombinedGraphQLErrors({
        errors: [
          {
            message: 'Base description has changed since candidate was generated',
            extensions: { code: 'STALE_CANDIDATE' },
          },
        ],
      })
    );

    const { result } = renderHook(() => useGenerateProductDescriptionButton(defaultSlug));

    await act(async () => {
      await result.current.handleGenerate();
    });

    await act(async () => {
      await result.current.handleApply();
    });

    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '적용 실패',
        message: 'Base description has changed since candidate was generated',
        color: 'red',
      })
    );
    expect(result.current.isApplying).toBe(false);
    expect(result.current.isPreviewOpen).toBe(true); // remains open so admin sees what happened
    expect(result.current.staleApplyNotice).toBe('Base description has changed since candidate was generated');
  });

  it('reopens a completed candidate by job ID rendering stored HTML', async () => {
    lazyQueryFn.mockResolvedValueOnce({
      data: {
        tempProductBySlug: { id: 'prod-1' },
        productDescriptionJob: {
          id: 'job-stored',
          productId: 'prod-1',
          status: 'completed',
          appliedAt: '2026-10-01T00:00:00.000Z',
          candidateHtml: '<p>stored bytes</p>',
          message: 'done',
        },
      },
    });

    const { result } = renderHook(() => useGenerateProductDescriptionButton(defaultSlug));

    await act(async () => {
      result.current.setJobIdInput('job-stored');
    });

    await act(async () => {
      await result.current.handleReopenJob();
    });

    expect(lazyQueryFn).toHaveBeenCalledWith({ variables: { id: 'job-stored', slug: defaultSlug } });
    expect(result.current.candidateJob?.candidateHtml).toBe('<p>stored bytes</p>');
    expect(result.current.isPreviewOpen).toBe(true);
  });

  it('rejects reopening a non-completed candidate without clearing stored HTML', async () => {
    generateMutateFn.mockResolvedValueOnce({
      data: {
        generateProductDescription: {
          product: { id: 'prod-1', name: 'Test', description: null },
          job: {
            id: 'job-keep',
            productId: 'prod-1',
            status: 'completed',
            candidateHtml: '<p>keep</p>',
          },
        },
      },
    });
    lazyQueryFn.mockResolvedValueOnce({
      data: {
        tempProductBySlug: { id: 'prod-1' },
        productDescriptionJob: {
          id: 'job-pending',
          productId: 'prod-1',
          status: 'pending',
          candidateHtml: null,
        },
      },
    });

    const { result } = renderHook(() => useGenerateProductDescriptionButton(defaultSlug));

    await act(async () => {
      await result.current.handleGenerate();
    });
    await act(async () => {
      result.current.setJobIdInput('job-pending');
    });
    await act(async () => {
      await result.current.handleReopenJob();
    });

    expect(result.current.candidateJob?.candidateHtml).toBe('<p>keep</p>');
    expect(result.current.isPreviewOpen).toBe(true);
  });

  it('treats superseded polling result as regenerate guidance', async () => {
    vi.useFakeTimers();
    generateMutateFn.mockResolvedValueOnce({
      data: {
        generateProductDescription: {
          product: { id: 'prod-1', name: 'Test', description: null },
          job: { id: 'job-super', productId: 'prod-1', status: 'pending', message: '대기 중' },
        },
      },
    });
    lazyQueryFn.mockResolvedValueOnce({
      data: {
        productDescriptionJob: { id: 'job-super', status: 'superseded', candidateHtml: null },
      },
    });

    const { result } = renderHook(() => useGenerateProductDescriptionButton(defaultSlug));

    let generatePromise: Promise<void>;
    act(() => {
      generatePromise = result.current.handleGenerate();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
      await generatePromise;
    });

    expect(notifications.show).toHaveBeenCalledWith(expect.objectContaining({ title: '후보 폐기', color: 'red' }));
    expect(result.current.candidateJob).toBeNull();
    expect(result.current.isPreviewOpen).toBe(false);
    vi.useRealTimers();
  });
  it('opens a legacy stored candidate directly from the route and refuses another product', async () => {
    lazyQueryFn.mockResolvedValue({
      data: {
        tempProductBySlug: { id: 'prod-1' },
        productDescriptionJob: {
          id: 'legacy-route',
          productId: 'prod-1',
          status: 'completed',
          candidateHtml: '<h2>저장된 제목</h2><p>원본 본문</p>',
          appliedAt: null,
        },
      },
    });
    const { result, rerender } = renderHook(({ id }) => useGenerateProductDescriptionButton(defaultSlug, id), {
      initialProps: { id: 'legacy-route' },
    });
    await act(async () => {});
    expect(result.current.isPreviewOpen).toBe(true);
    expect(result.current.candidateJob?.candidateHtml).toContain('<h2>저장된 제목</h2>');
    lazyQueryFn.mockResolvedValue({
      data: {
        tempProductBySlug: { id: 'prod-1' },
        productDescriptionJob: {
          id: 'foreign',
          productId: 'prod-2',
          status: 'completed',
          candidateHtml: '<p>다른 제품</p>',
        },
      },
    });
    rerender({ id: 'foreign' });
    await act(async () => {});
    expect(result.current.candidateJob).toBeNull();
    expect(result.current.isPreviewOpen).toBe(false);
    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({ title: '후보 다시 열기 실패', message: expect.stringContaining('다른 제품') })
    );
  });

  it('does not reinterpret a message-only error as STALE_CANDIDATE', async () => {
    generateMutateFn.mockResolvedValue({
      data: {
        generateProductDescription: { job: { id: 'not-stale', status: 'completed', candidateHtml: '<p>후보</p>' } },
      },
    });
    applyMutateFn.mockRejectedValue(new Error('Base description has changed'));
    const { result } = renderHook(() => useGenerateProductDescriptionButton(defaultSlug));
    await act(async () => {
      await result.current.handleGenerate();
      await result.current.handleApply();
    });
    expect(result.current.staleApplyNotice).toBeNull();
  });
});
