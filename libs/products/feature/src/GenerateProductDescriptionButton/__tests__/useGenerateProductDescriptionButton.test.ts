import { useApolloClient, useLazyQuery, useMutation } from '@apollo/client/react';
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
  let mutateFn: ReturnType<typeof vi.fn>;
  let lazyQueryFn: ReturnType<typeof vi.fn>;
  let refetchQueriesFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mutateFn = vi.fn();
    lazyQueryFn = vi.fn();
    refetchQueriesFn = vi.fn().mockResolvedValue([]);

    vi.mocked(useApolloClient).mockReturnValue({
      refetchQueries: refetchQueriesFn,
    } as unknown as ReturnType<typeof useApolloClient>);

    vi.mocked(useMutation).mockReturnValue([mutateFn, { loading: false }] as unknown as ReturnType<typeof useMutation>);
    vi.mocked(useLazyQuery).mockReturnValue([lazyQueryFn, { loading: false }] as unknown as ReturnType<
      typeof useLazyQuery
    >);
  });

  it('calls generateProductDescription mutation with slug and handles immediate completion', async () => {
    const { result } = renderHook(() => useGenerateProductDescriptionButton(defaultSlug));

    mutateFn.mockResolvedValueOnce({
      data: {
        generateProductDescription: {
          product: { id: 'prod-1', name: 'Test', description: 'Generated' },
          job: {
            id: 'job-1',
            productId: 'prod-1',
            status: 'completed',
            message: 'AI 소개를 생성했어요.',
          },
        },
      },
    });

    await act(async () => {
      await result.current.handleGenerate();
    });

    expect(mutateFn).toHaveBeenCalledWith({
      variables: {
        input: { slug: defaultSlug },
      },
      context: {
        timeout: 25000,
      },
    });

    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '생성 완료',
        message: 'AI 소개를 생성했어요.',
        color: 'teal',
      })
    );
    expect(refetchQueriesFn).toHaveBeenCalled();
  });

  it('handles immediate failure when job status is failed', async () => {
    const { result } = renderHook(() => useGenerateProductDescriptionButton(defaultSlug));

    mutateFn.mockResolvedValueOnce({
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
  });

  it('handles mutation error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useGenerateProductDescriptionButton(defaultSlug));

    mutateFn.mockRejectedValueOnce(new Error('Network error'));

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
    mutateFn.mockReturnValue(
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

    expect(mutateFn).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveMutation({
        data: {
          generateProductDescription: {
            product: { id: 'prod-1' },
            job: { status: 'completed' },
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
    mutateFn.mockReturnValue(new Promise(() => {}));

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

  it('polls job status when initial status is pending and completes when completed', async () => {
    vi.useFakeTimers();
    mutateFn.mockResolvedValueOnce({
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
      variables: { id: 'job-123' },
    });

    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '생성 완료',
        message: 'AI 소개를 생성했어요.',
        color: 'teal',
      })
    );
    expect(refetchQueriesFn).toHaveBeenCalled();
    expect(result.current.isGenerating).toBe(false);
    vi.useRealTimers();
  });

  it('polls job status and handles job failure', async () => {
    vi.useFakeTimers();
    mutateFn.mockResolvedValueOnce({
      data: {
        generateProductDescription: {
          product: { id: 'prod-1', name: 'Test', description: null },
          job: {
            id: 'job-123',
            productId: 'prod-1',
            status: 'in_progress',
            message: '진행 중',
          },
        },
      },
    });

    lazyQueryFn.mockResolvedValueOnce({
      data: {
        productDescriptionJob: {
          id: 'job-123',
          status: 'failed',
          error: 'LLM Timeout',
          message: 'AI 소개 생성에 실패했습니다.',
        },
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

    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '생성 실패',
        message: 'LLM Timeout',
        color: 'red',
      })
    );
    expect(result.current.isGenerating).toBe(false);
    vi.useRealTimers();
  });

  it('handles polling timeout when job takes longer than 3 minutes', async () => {
    vi.useFakeTimers();
    let currentTime = 1000;
    const dateSpy = vi.spyOn(Date, 'now').mockImplementation(() => currentTime);

    mutateFn.mockResolvedValueOnce({
      data: {
        generateProductDescription: {
          product: { id: 'prod-1', name: 'Test', description: null },
          job: {
            id: 'job-123',
            productId: 'prod-1',
            status: 'pending',
          },
        },
      },
    });

    lazyQueryFn.mockResolvedValue({
      data: {
        productDescriptionJob: {
          id: 'job-123',
          status: 'in_progress',
        },
      },
    });

    const { result } = renderHook(() => useGenerateProductDescriptionButton(defaultSlug));

    let generatePromise: Promise<void>;
    act(() => {
      generatePromise = result.current.handleGenerate();
    });

    // Let the mutation resolve so startTime is captured at currentTime = 1000
    await act(async () => {
      await Promise.resolve();
    });

    // Advance time past 3 minutes (180_000ms)
    currentTime += 180_001;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
      await generatePromise;
    });

    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '생성 진행 중 (시간 소요)',
        color: 'blue',
      })
    );
    expect(result.current.isGenerating).toBe(false);
    dateSpy.mockRestore();
    vi.useRealTimers();
  });
});
