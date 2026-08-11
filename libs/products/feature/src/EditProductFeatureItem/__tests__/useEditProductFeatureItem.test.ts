import { type ApolloCache, type DocumentNode } from '@apollo/client';
import { useApolloClient, useMutation, useQuery, type MutationHookOptions } from '@apollo/client/react';
import { notifications } from '@mantine/notifications';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockForm = {
  setValues: vi.fn(),
  getInputProps: vi.fn(() => ({ key: 'test-form-key', defaultValue: '' })),
  onSubmit: vi.fn((handler: (values: Record<string, string>) => Promise<void>) => handler),
};

vi.mock('@apollo/client/react', async importOriginal => {
  const actual = await importOriginal();
  return {
    ...(actual as Record<string, unknown>),
    useMutation: vi.fn(),
    useQuery: vi.fn(),
    useApolloClient: vi.fn(),
  };
});

vi.mock('@mantine/form', () => ({
  useForm: vi.fn(() => mockForm),
}));

vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn() },
}));

import { useEditProductFeatureItem } from '../useEditProductFeatureItem';

describe('useEditProductFeatureItem', () => {
  const defaultProps = { featureId: 'feature-1' };
  type MockMutationOptions = MutationHookOptions<unknown, Record<string, unknown>, unknown, ApolloCache>;
  let mutateFn: ReturnType<typeof vi.fn>;
  let mutationOptions: { onCompleted?: (data: unknown) => Promise<void> | void; onError?: (e: Error) => void };
  let resolveRefetch: (() => void) | undefined;
  const mockRefetchQueries = vi.fn(
    () =>
      new Promise<void>(resolve => {
        resolveRefetch = resolve;
      })
  );

  beforeEach(() => {
    vi.clearAllMocks();
    mutateFn = vi.fn();
    mutationOptions = {};
    resolveRefetch = undefined;

    vi.mocked(useQuery).mockReturnValue({
      data: {
        feature: {
          id: 'feature-1',
          emoji: '🚀',
          name: 'Test Feature',
          summary: 'A test feature',
        },
      },
      loading: false,
    } as ReturnType<typeof useQuery>);

    vi.mocked(useMutation).mockImplementation(((_document?: DocumentNode, options?: MockMutationOptions) => {
      mutationOptions =
        (options as { onCompleted?: (data: unknown) => Promise<void> | void; onError?: (e: Error) => void }) || {};
      return [mutateFn, { loading: false }] as unknown as ReturnType<typeof useMutation>;
    }) as typeof useMutation);

    vi.mocked(useApolloClient).mockReturnValue({
      refetchQueries: mockRefetchQueries,
      cache: { evict: vi.fn() },
    } as unknown as ReturnType<typeof useApolloClient>);
  });

  it('should call onSubmit and show success notification in onCompleted', () => {
    const onSubmit = vi.fn();
    renderHook(() => useEditProductFeatureItem({ ...defaultProps, onSubmit }));

    act(() => {
      mutationOptions.onCompleted?.({ updateProductFeature: { feature: { id: 'feature-1' } } });
    });

    expect(notifications.show).toHaveBeenCalledWith({ message: '수정되었습니다.', color: 'teal' });
    expect(onSubmit).toHaveBeenCalled();
  });

  it('should pass correct refetch document and awaitRefetchQueries to useMutation', () => {
    const capturedDocuments: DocumentNode[] = [];
    vi.mocked(useMutation).mockImplementation(((document?: DocumentNode, options?: MockMutationOptions) => {
      capturedDocuments.push(document as DocumentNode);
      mutationOptions =
        (options as { onCompleted?: (data: unknown) => Promise<void> | void; onError?: (e: Error) => void }) || {};
      return [mutateFn, { loading: false }] as unknown as ReturnType<typeof useMutation>;
    }) as typeof useMutation);

    renderHook(() => useEditProductFeatureItem(defaultProps));

    expect(capturedDocuments).toHaveLength(1);
    expect(capturedDocuments[0]).toBeDefined();
    const mutationOptionsTyped = mutationOptions as unknown as MockMutationOptions;
    expect(mutationOptionsTyped?.awaitRefetchQueries).toBe(true);
  });

  it('should show error notification via onError', () => {
    renderHook(() => useEditProductFeatureItem(defaultProps));

    act(() => {
      mutationOptions.onError?.(new Error('GraphQL error'));
    });

    expect(notifications.show).toHaveBeenCalledWith({ message: 'GraphQL error', color: 'red' });
  });

  it('should show validation notification when all fields are empty and not call mutation', async () => {
    const { result } = renderHook(() => useEditProductFeatureItem(defaultProps));

    await act(async () => {
      await result.current.submit({ emoji: '', name: '', summary: '' });
    });

    expect(notifications.show).toHaveBeenCalledWith({ message: '값을 입력해주세요!!', color: 'red' });
    expect(mutateFn).not.toHaveBeenCalled();
  });
});
