import { type ApolloCache, type DocumentNode } from '@apollo/client';
import { useMutation, useQuery, type MutationHookOptions } from '@apollo/client/react';
import { notifications } from '@mantine/notifications';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@apollo/client/react', async importOriginal => {
  const actual = await importOriginal();
  return {
    ...(actual as Record<string, unknown>),
    useMutation: vi.fn(),
    useQuery: vi.fn(),
  };
});

const mockForm = {
  reset: vi.fn(),
  setValues: vi.fn(),
  values: { name: '', summary: '' },
  getInputProps: vi.fn(() => ({ key: 'test-form-key', defaultValue: '' })),
  onSubmit: vi.fn((handler: (values: Record<string, string>) => Promise<void>) => handler),
};

vi.mock('@mantine/form', () => ({
  useForm: vi.fn(() => mockForm),
}));

vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn() },
}));

import { useEditProductInfo } from '../useEditProductInfo';

describe('useEditProductInfo', () => {
  const defaultSlug = 'test-product';
  type MockMutationOptions = MutationHookOptions<unknown, Record<string, unknown>, unknown, ApolloCache>;
  let mutateFn: ReturnType<typeof vi.fn>;
  let mutationOptions: { onCompleted?: (data: unknown) => void; onError?: (e: Error) => void };

  beforeEach(() => {
    vi.clearAllMocks();
    mutateFn = vi.fn();
    mutationOptions = {};

    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      loading: false,
    } as ReturnType<typeof useQuery>);

    vi.mocked(useMutation).mockImplementation(((_document?: DocumentNode, options?: MockMutationOptions) => {
      mutationOptions = (options as { onCompleted?: (data: unknown) => void; onError?: (e: Error) => void }) || {};
      return [mutateFn, { loading: false }] as unknown as ReturnType<typeof useMutation>;
    }) as typeof useMutation);
  });

  it('should show success notification and call onSubmit on completed', () => {
    const onSubmit = vi.fn();
    renderHook(() => useEditProductInfo({ slug: defaultSlug, onSubmit }));

    act(() => {
      mutationOptions.onCompleted?.({
        editProduct: {
          product: { id: 'product-1', name: 'Test', summary: 'Summary' },
        },
      });
    });

    expect(notifications.show).toHaveBeenCalledWith({ message: '수정되었습니다!', color: 'teal' });
    expect(mockForm.reset).toHaveBeenCalled();
    expect(onSubmit).toHaveBeenCalled();
  });

  it('should show error notification via onError', () => {
    renderHook(() => useEditProductInfo({ slug: defaultSlug }));

    act(() => {
      mutationOptions.onError?.(new Error('GraphQL error'));
    });

    expect(notifications.show).toHaveBeenCalledWith({ message: 'GraphQL error', color: 'red' });
  });

  it('should call mutation with correct variables', async () => {
    const { result } = renderHook(() => useEditProductInfo({ slug: defaultSlug }));

    mutateFn.mockResolvedValueOnce({ data: { editProduct: { product: { id: 'product-1' } } } });

    await act(async () => {
      await result.current.submit({ name: 'New Name', summary: 'New Summary' });
    });

    expect(mutateFn).toHaveBeenCalledWith({
      variables: {
        slug: defaultSlug,
        input: { name: 'New Name', summary: 'New Summary' },
      },
    });
  });

  it('should show validation notification when values are empty', async () => {
    const { result } = renderHook(() => useEditProductInfo({ slug: defaultSlug }));

    await act(async () => {
      await result.current.submit({});
    });

    expect(notifications.show).toHaveBeenCalledWith({ message: '값을 입력해주세요!!', color: 'red' });
    expect(mutateFn).not.toHaveBeenCalled();
  });

  it('should not call onSubmit when onCompleted condition fails', () => {
    const onSubmit = vi.fn();
    renderHook(() => useEditProductInfo({ slug: defaultSlug, onSubmit }));

    act(() => {
      mutationOptions.onCompleted?.({
        editProduct: {
          product: { id: '', name: '', summary: '' },
        },
      });
    });

    expect(notifications.show).not.toHaveBeenCalledWith({ message: '수정되었습니다!', color: 'teal' });
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
