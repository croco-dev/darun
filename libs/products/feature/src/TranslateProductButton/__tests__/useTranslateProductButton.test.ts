import { useLazyQuery, useMutation } from '@apollo/client/react';
import { notifications } from '@mantine/notifications';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@apollo/client/react', async importOriginal => {
  const actual = await importOriginal();
  return {
    ...(actual as Record<string, unknown>),
    useMutation: vi.fn(),
    useLazyQuery: vi.fn(),
  };
});

vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
    hide: vi.fn(),
  },
}));

import { useTranslateProductButton } from '../useTranslateProductButton';

describe('useTranslateProductButton', () => {
  const defaultSlug = 'test-product';
  let mutateFn: ReturnType<typeof vi.fn>;
  let lazyQueryFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mutateFn = vi.fn();
    lazyQueryFn = vi.fn();
    vi.mocked(useMutation).mockReturnValue([mutateFn, { loading: false }] as unknown as ReturnType<typeof useMutation>);
    vi.mocked(useLazyQuery).mockReturnValue([lazyQueryFn, { loading: false }] as unknown as ReturnType<
      typeof useLazyQuery
    >);
  });

  it('calls requestProductTranslation mutation with slug', async () => {
    const { result } = renderHook(() => useTranslateProductButton({ slug: defaultSlug }));

    mutateFn.mockResolvedValueOnce({
      data: {
        requestProductTranslation: {
          entityId: 'prod-1',
          status: 'completed',
          message: '번역 완료',
        },
      },
    });

    await act(async () => {
      await result.current.translateProduct();
    });

    expect(mutateFn).toHaveBeenCalledWith({
      variables: {
        slug: defaultSlug,
      },
      context: {
        timeout: 25000,
      },
    });

    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '번역 진행 중',
      })
    );
  });

  it('handles mutation error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useTranslateProductButton({ slug: defaultSlug }));

    mutateFn.mockRejectedValueOnce(new Error('Translation failed'));

    await act(async () => {
      await result.current.translateProduct();
    });

    expect(notifications.hide).toHaveBeenCalledWith(`translating-${defaultSlug}`);
    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '번역 실패',
        message: 'Translation failed',
        color: 'red',
      })
    );
    expect(consoleSpy).toHaveBeenCalledWith('Translation mutation failed:', expect.any(Error));
    expect(result.current.loading).toBe(false);
    consoleSpy.mockRestore();
  });

  it('prevents duplicate calls when already loading', async () => {
    let resolveMutation: (val: unknown) => void = () => {};
    mutateFn.mockReturnValueOnce(
      new Promise(resolve => {
        resolveMutation = resolve;
      })
    );

    const { result } = renderHook(() => useTranslateProductButton({ slug: defaultSlug }));

    let firstPromise: Promise<void>;
    act(() => {
      firstPromise = result.current.translateProduct();
    });

    expect(result.current.loading).toBe(true);

    // Call again while still loading
    await act(async () => {
      await result.current.translateProduct();
    });

    expect(mutateFn).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveMutation({ data: { requestProductTranslation: { status: 'completed' } } });
      await firstPromise;
    });

    expect(result.current.loading).toBe(false);
  });

  it('prevents rapid double-clicks synchronously via ref guard', async () => {
    let resolveMutation: (val: unknown) => void = () => {};
    mutateFn.mockReturnValue(
      new Promise(resolve => {
        resolveMutation = resolve;
      })
    );

    const { result } = renderHook(() => useTranslateProductButton({ slug: defaultSlug }));

    let firstPromise: Promise<void>;
    let secondPromise: Promise<void>;
    act(() => {
      firstPromise = result.current.translateProduct();
      secondPromise = result.current.translateProduct();
    });

    expect(mutateFn).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveMutation({ data: { requestProductTranslation: { status: 'completed' } } });
      await firstPromise;
      await secondPromise;
    });

    expect(result.current.loading).toBe(false);
  });

  it('handles client timeout gracefully when mutation hangs', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.useFakeTimers();
    mutateFn.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useTranslateProductButton({ slug: defaultSlug }));

    let translatePromise: Promise<void>;
    act(() => {
      translatePromise = result.current.translateProduct();
    });

    expect(result.current.loading).toBe(true);

    // Negative control: 1ms before timeout, operation is still pending
    await act(async () => {
      vi.advanceTimersByTime(24_999);
    });
    expect(result.current.loading).toBe(true);

    // Exactly at timeout: operation fails
    await act(async () => {
      vi.advanceTimersByTime(1);
      await translatePromise;
    });

    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '번역 실패',
        message: '번역 요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.',
        color: 'red',
      })
    );
    expect(result.current.loading).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
    consoleSpy.mockRestore();
  });

  it('displays exactly one success notification on completion and cleans up timeout timer', async () => {
    vi.useFakeTimers();
    mutateFn.mockResolvedValueOnce({
      data: {
        requestProductTranslation: {
          entityId: 'prod-1',
          status: 'completed',
          message: '번역 완료',
        },
      },
    });

    const { result } = renderHook(() => useTranslateProductButton({ slug: defaultSlug }));

    await act(async () => {
      await result.current.translateProduct();
    });

    const successToasts = vi.mocked(notifications.show).mock.calls.filter(call => call[0]?.title === '번역 완료');
    expect(successToasts).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
  });

  it('handles Apollo TimeoutError gracefully with Korean error toast and cleans up timer', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.useFakeTimers();
    const apolloTimeoutErr = new Error(
      "GraphQL operation 'RequestProductTranslationOnTranslateButton' timed out after 25000ms"
    );
    apolloTimeoutErr.name = 'TimeoutError';
    mutateFn.mockRejectedValueOnce(apolloTimeoutErr);

    const { result } = renderHook(() => useTranslateProductButton({ slug: defaultSlug }));

    await act(async () => {
      await result.current.translateProduct();
    });

    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '번역 실패',
        message: '번역 요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.',
        color: 'red',
      })
    );
    expect(result.current.loading).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
    consoleSpy.mockRestore();
  });

  it('shows error notification when status is failed', async () => {
    mutateFn.mockResolvedValueOnce({
      data: {
        requestProductTranslation: {
          entityId: 'prod-1',
          status: 'failed',
          message: 'LLM context overflow',
        },
      },
    });

    const { result } = renderHook(() => useTranslateProductButton({ slug: defaultSlug }));

    await act(async () => {
      await result.current.translateProduct();
    });

    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '번역 실패',
        message: 'LLM context overflow',
        color: 'red',
      })
    );
    expect(result.current.loading).toBe(false);
  });

  it('polls job status when initial status is pending and completes when completed', async () => {
    vi.useFakeTimers();
    mutateFn.mockResolvedValueOnce({
      data: {
        requestProductTranslation: {
          id: 'job-123',
          entityId: 'prod-1',
          status: 'pending',
          message: '대기 중',
        },
      },
    });

    lazyQueryFn.mockResolvedValueOnce({
      data: {
        translationJob: {
          id: 'job-123',
          status: 'completed',
          message: '영문 번역이 완료되었습니다.',
        },
      },
    });

    const { result } = renderHook(() => useTranslateProductButton({ slug: defaultSlug }));

    let translatePromise: Promise<void>;
    act(() => {
      translatePromise = result.current.translateProduct();
    });

    // Advance by poll interval (2000ms)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
      await translatePromise;
    });

    expect(lazyQueryFn).toHaveBeenCalledWith({
      variables: { id: 'job-123' },
    });

    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '번역 완료',
        message: '영문 번역이 완료되었습니다.',
        color: 'teal',
      })
    );
    expect(result.current.loading).toBe(false);
    vi.useRealTimers();
  });
});
