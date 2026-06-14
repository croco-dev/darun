import { type ApolloCache, type DocumentNode } from '@apollo/client';
import { useMutation, useLazyQuery, type MutationHookOptions } from '@apollo/client/react';
import { notifications } from '@mantine/notifications';
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@apollo/client/react', async importOriginal => {
  const actual = await importOriginal();
  return {
    ...(actual as Record<string, unknown>),
    useMutation: vi.fn(),
    useLazyQuery: vi.fn(),
  };
});

const mockForm = {
  reset: vi.fn(),
  getInputProps: vi.fn(() => ({ key: 'test-form-key', defaultValue: '' })),
  onSubmit: vi.fn((handler: (values: Record<string, string>) => void) => handler),
  setFieldValue: vi.fn(),
};

vi.mock('@mantine/form', () => ({
  useForm: vi.fn(() => mockForm),
}));

vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn() },
}));

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: mockPush })),
}));

vi.mock('@mantine/hooks', () => ({
  useThrottledCallback: vi.fn((fn: (...args: unknown[]) => unknown) => fn),
}));

import { useEditProductCompany } from '../useEditProductCompany';

describe('useEditProductCompany', () => {
  const slug = 'test-slug';
  type MockMutationOptions = MutationHookOptions<unknown, Record<string, unknown>, unknown, ApolloCache>;

  let mutateFn: ReturnType<typeof vi.fn>;
  let searchFn: ReturnType<typeof vi.fn>;
  let mutationOptions: {
    onCompleted?: (data: unknown) => void;
    onError?: (e: Error) => void;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mutateFn = vi.fn();
    searchFn = vi.fn();
    mutationOptions = {};

    vi.mocked(useMutation).mockImplementation(((_document?: DocumentNode, options?: MockMutationOptions) => {
      mutationOptions =
        (options as {
          onCompleted?: (data: unknown) => void;
          onError?: (e: Error) => void;
        }) ?? {};
      return [mutateFn, { loading: false }] as unknown as ReturnType<typeof useMutation>;
    }) as typeof useMutation);

    vi.mocked(useLazyQuery).mockReturnValue([searchFn, { loading: false }] as unknown as ReturnType<
      typeof useLazyQuery
    >);
  });

  it('should search companies and update companies state via handleSearchChange', async () => {
    const { result } = renderHook(() => useEditProductCompany({ slug }));

    searchFn.mockResolvedValueOnce({
      data: {
        searchCompanies: [
          { id: '1', name: 'Company A', __typename: 'Company' },
          { id: '2', name: 'Company B', __typename: 'Company' },
        ],
      },
    });

    await act(async () => {
      result.current.handleSearchChange('test');
    });

    expect(result.current.searchValue).toBe('test');
    expect(searchFn).toHaveBeenCalledWith({ variables: { query: 'test' } });

    await waitFor(() => {
      expect(result.current.companies).toEqual([
        { label: 'Company A', value: '1' },
        { label: 'Company B', value: '2' },
      ]);
    });
  });

  it('should clear companies when search query is empty', async () => {
    const { result } = renderHook(() => useEditProductCompany({ slug }));

    await act(async () => {
      result.current.handleSearchChange('');
    });

    expect(result.current.searchValue).toBe('');
    expect(result.current.companies).toEqual([]);
    expect(searchFn).not.toHaveBeenCalled();
  });

  it('should show notification and skip mutation when submitting without a company', () => {
    const { result } = renderHook(() => useEditProductCompany({ slug }));

    act(() => {
      result.current.handleSubmit({ companyId: '' });
    });

    expect(notifications.show).toHaveBeenCalledWith({
      message: '회사를 선택해주세요.',
      color: 'red',
    });
    expect(mutateFn).not.toHaveBeenCalled();
  });

  it('should call mutation with correct variables when a company is selected', () => {
    const { result } = renderHook(() => useEditProductCompany({ slug }));

    act(() => {
      result.current.handleSubmit({ companyId: 'company-1' });
    });

    expect(mutateFn).toHaveBeenCalledWith({
      variables: { input: { companyId: 'company-1' }, slug },
    });
  });

  it('should show error notification when mutation onError is triggered', () => {
    renderHook(() => useEditProductCompany({ slug }));

    act(() => {
      mutationOptions.onError?.(new Error('Network error'));
    });

    expect(notifications.show).toHaveBeenCalledWith({
      title: '오류 발생',
      message: 'Network error',
      color: 'red',
    });
  });

  it('should show success notification and redirect on mutation onCompleted', () => {
    renderHook(() => useEditProductCompany({ slug }));

    act(() => {
      mutationOptions.onCompleted?.({
        registerProductCompany: {
          __typename: 'RegisterProductCompanyPayload',
          product: { id: 'product-1', __typename: 'Product' },
        },
      });
    });

    expect(notifications.show).toHaveBeenCalledWith({
      message: '저장되었습니다.',
      color: 'green',
    });
    expect(mockPush).toHaveBeenCalledWith(`/products/${slug}`);
  });
});
