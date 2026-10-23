import { useMutation, useQuery } from '@apollo/client/react';
import { notifications } from '@mantine/notifications';
import { renderHook, act, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useIndexProductButton } from '../useIndexProductButton';

vi.mock('@apollo/client/react', () => ({
  useMutation: vi.fn(),
  useQuery: vi.fn(),
}));
vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));

const intent = {
  intentId: 'intent-1',
  productId: 'product-1',
  sourceRevision: '9007199254740993',
  status: 'pending',
};
const mutate = vi.fn();
const refetch = vi.fn();
let query: { status?: typeof intent & { error?: string }; error?: Error };
let registering = false;
function data() {
  return query.status
    ? {
        productContentSyncStatus: {
          productId: intent.productId,
          sourceRevision: intent.sourceRevision,
          searchStatus: query.status.status,
          translationDispatchStatus: 'not_required',
          searchIntent: query.status,
        },
      }
    : undefined;
}
async function poll() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000);
  });
}

describe('useIndexProductButton durable completion', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    registering = false;
    query = { status: intent };
    mutate.mockResolvedValue({ data: { indexProduct: intent } });
    refetch.mockImplementation(async () => {
      if (query.error) throw query.error;
      return { data: data() };
    });
    vi.mocked(useMutation).mockImplementation(() => [mutate, { loading: registering }] as never);
    vi.mocked(useQuery).mockImplementation(() => ({ data: data(), error: query.error, refetch }) as never);
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('announces reservation, stays pending through delayed Mongo, and announces only queried completion once', async () => {
    const { result } = renderHook(() => useIndexProductButton({ slug: 'sample' }));
    await act(async () => {
      await result.current.indexProduct();
    });
    expect(mutate).toHaveBeenCalledWith({
      variables: { input: { slug: 'sample' } },
    });
    expect(notifications.show).toHaveBeenCalledWith({
      message: '검색 동기화가 예약되었습니다.',
      color: 'blue',
    });
    expect(result.current.loading).toBe(true);
    for (const status of ['pending', 'in_progress']) {
      query = { status: { ...intent, status } };
      await poll();
      expect(result.current.loading).toBe(true);
      expect(notifications.show).not.toHaveBeenCalledWith(expect.objectContaining({ color: 'teal' }));
    }
    query = { status: { ...intent, status: 'completed' } };
    await poll();
    await poll();
    expect(result.current.loading).toBe(false);
    expect(notifications.show).toHaveBeenCalledTimes(2);
    expect(notifications.show).toHaveBeenLastCalledWith({
      message: '상품이 색인되었습니다.',
      color: 'teal',
    });
  });

  it('reused completed identity must fetch fresh pending status and restart polling without stale success', async () => {
    const { result } = renderHook(() => useIndexProductButton({ slug: 'sample' }));
    await act(async () => {
      await result.current.indexProduct();
    });
    query = { status: { ...intent, status: 'completed' } };
    await poll();
    vi.mocked(notifications.show).mockClear();
    query = { status: intent };
    await act(async () => {
      await result.current.indexProduct();
    });
    expect(refetch).toHaveBeenCalledWith({ slug: 'sample' });
    expect(result.current.loading).toBe(true);
    expect(notifications.show).toHaveBeenCalledExactlyOnceWith({
      message: '검색 동기화가 예약되었습니다.',
      color: 'blue',
    });
    query = { status: { ...intent, status: 'completed' } };
    await poll();
    expect(notifications.show).toHaveBeenLastCalledWith({
      message: '상품이 색인되었습니다.',
      color: 'teal',
    });
  });

  it.each(['completed', 'failed'])(
    'restarts stopped %s polling for a different revision intent on the same route',
    async terminal => {
      const { result } = renderHook(() => useIndexProductButton({ slug: 'sample' }));
      await act(async () => {
        await result.current.indexProduct();
      });
      query = { status: { ...intent, status: terminal } };
      await poll();
      const next = {
        ...intent,
        intentId: 'intent-2',
        sourceRevision: '9007199254740994',
      };
      mutate.mockResolvedValueOnce({ data: { indexProduct: next } });
      query = { status: next };
      vi.mocked(notifications.show).mockClear();
      await act(async () => {
        await result.current.indexProduct();
      });
      expect(refetch).toHaveBeenLastCalledWith({ slug: 'sample' });
      expect(result.current.loading).toBe(true);
      expect(notifications.show).not.toHaveBeenCalledWith(expect.objectContaining({ color: 'teal' }));
      query = { status: { ...next, status: 'completed' } };
      await poll();
      expect(result.current.loading).toBe(false);
      expect(notifications.show).toHaveBeenLastCalledWith({
        message: '상품이 색인되었습니다.',
        color: 'teal',
      });
    }
  );

  it.each(['intent-1', 'intent-2'])(
    'keeps %s registered through lookup failure and observes its later completed poll',
    async nextId => {
      const { result } = renderHook(() => useIndexProductButton({ slug: 'sample' }));
      await act(async () => {
        await result.current.indexProduct();
      });
      query = { status: { ...intent, status: 'completed' } };
      await poll();
      vi.mocked(notifications.show).mockClear();
      const next = {
        ...intent,
        intentId: nextId,
        sourceRevision: '9007199254740994',
      };
      mutate.mockResolvedValueOnce({ data: { indexProduct: next } });
      refetch.mockRejectedValueOnce(new Error('fresh lookup failed'));
      await act(async () => {
        await result.current.indexProduct();
      });
      expect(notifications.show).toHaveBeenCalledWith({
        message: 'fresh lookup failed',
        color: 'red',
      });
      expect(notifications.show).not.toHaveBeenCalledWith(expect.objectContaining({ color: 'teal' }));
      expect(result.current).toMatchObject({
        loading: false,
        error: 'fresh lookup failed',
      });
      query = { status: { ...next, status: 'completed' } };
      await poll();
      expect(result.current.loading).toBe(false);
      expect(notifications.show).toHaveBeenLastCalledWith({
        message: '상품이 색인되었습니다.',
        color: 'teal',
      });
    }
  );

  it.each(['SEARCH_UNAVAILABLE', 'SEARCH_WRITE_FAILED', 'CONTENT_SYNC_QUEUE_FAILED'])(
    'keeps %s visible without false completion and allows retry',
    async error => {
      const { result } = renderHook(() => useIndexProductButton({ slug: 'sample' }));
      await act(async () => {
        await result.current.indexProduct();
      });
      query = { status: { ...intent, status: 'failed', error } };
      await poll();
      expect(result.current).toMatchObject({ loading: false, error });
      expect(notifications.show).toHaveBeenLastCalledWith({
        message: error,
        color: 'red',
      });
      expect(notifications.show).not.toHaveBeenCalledWith(expect.objectContaining({ color: 'teal' }));
      query = { status: intent };
      await act(async () => {
        await result.current.indexProduct();
      });
      expect(mutate).toHaveBeenCalledTimes(2);
    }
  );

  it('shows intent write errors without a reservation and does not throw an unhandled rejection', async () => {
    mutate.mockRejectedValueOnce(new Error('CONTENT_SYNC_INTENT_WRITE_FAILED'));
    const { result } = renderHook(() => useIndexProductButton({ slug: 'sample' }));
    await act(async () => {
      await result.current.indexProduct();
    });
    expect(notifications.show).toHaveBeenCalledExactlyOnceWith({
      message: 'CONTENT_SYNC_INTENT_WRITE_FAILED',
      color: 'red',
    });
    expect(result.current.loading).toBe(false);
  });

  it('ignores another intent and a previous Product after route changes', async () => {
    const { result, rerender } = renderHook(({ slug }) => useIndexProductButton({ slug }), {
      initialProps: { slug: 'sample' },
    });
    await act(async () => {
      await result.current.indexProduct();
    });
    query = {
      status: { ...intent, intentId: 'different', status: 'completed' },
    };
    await poll();
    expect(result.current.loading).toBe(true);
    query = { status: { ...intent, status: 'completed' } };
    rerender({ slug: 'other-product' });
    await poll();
    expect(result.current.loading).toBe(false);
    expect(notifications.show).not.toHaveBeenCalledWith(expect.objectContaining({ color: 'teal' }));
  });

  it('exposes status lookup failure without claiming completion', async () => {
    const { result } = renderHook(() => useIndexProductButton({ slug: 'sample' }));
    await act(async () => {
      await result.current.indexProduct();
    });
    query = { error: new Error('status lookup failed') };
    await poll();
    expect(result.current).toMatchObject({
      loading: false,
      error: 'status lookup failed',
    });
    expect(notifications.show).not.toHaveBeenCalledWith(expect.objectContaining({ color: 'teal' }));
  });

  it('settles a superseded reservation without completing it and resumes only for a new reservation', async () => {
    const { result } = renderHook(() => useIndexProductButton({ slug: 'sample' }));
    await act(async () => {
      await result.current.indexProduct();
    });
    const newer = { ...intent, intentId: 'intent-newer', sourceRevision: '9007199254740994' };
    query = { status: newer };
    await poll();
    expect(result.current).toMatchObject({ loading: false, error: undefined });
    expect(result.current.syncStatus?.searchIntent).toMatchObject(newer);
    expect(notifications.show).toHaveBeenLastCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('대체'),
        color: 'blue',
      })
    );
    expect(notifications.show).not.toHaveBeenCalledWith(expect.objectContaining({ color: 'teal' }));
    const lookups = refetch.mock.calls.length;
    await poll();
    await poll();
    expect(refetch).toHaveBeenCalledTimes(lookups);
    mutate.mockResolvedValueOnce({ data: { indexProduct: newer } });
    vi.mocked(notifications.show).mockClear();
    await act(async () => {
      await result.current.indexProduct();
    });
    expect(result.current.loading).toBe(true);
    query = { status: { ...newer, status: 'completed' } };
    await poll();
    await poll();
    expect(result.current.loading).toBe(false);
    expect(vi.mocked(notifications.show).mock.calls.filter(([notice]) => notice.color === 'teal')).toHaveLength(1);
  });

  it('prevents registration while the mutation is loading', async () => {
    registering = true;
    const { result } = renderHook(() => useIndexProductButton({ slug: 'sample' }));
    await act(async () => {
      await result.current.indexProduct();
    });
    expect(mutate).not.toHaveBeenCalled();
  });
});
