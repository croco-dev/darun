import { type ApolloCache, type DocumentNode } from '@apollo/client';
import { useMutation, type MutationHookOptions } from '@apollo/client/react';
import { notifications } from '@mantine/notifications';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@apollo/client/react', async importOriginal => {
  const actual = await importOriginal();
  return {
    ...(actual as Record<string, unknown>),
    useMutation: vi.fn(),
  };
});

const mockForm = {
  reset: vi.fn(),
  getInputProps: vi.fn(() => ({ key: 'test-form-key', defaultValue: '' })),
  onSubmit: vi.fn((handler: (values: Record<string, string>) => Promise<void>) => handler),
};

vi.mock('@mantine/form', () => ({
  useForm: vi.fn(() => mockForm),
}));

vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn() },
}));

import { useNewProductLinkForm } from '../useNewProductLinkForm';

describe('useNewProductLinkForm', () => {
  const defaultChildren = () => null;
  const defaultProps = {
    productSlug: 'test-slug',
    children: defaultChildren,
  };
  type MockMutationOptions = MutationHookOptions<unknown, Record<string, unknown>, unknown, ApolloCache>;
  let mutateFn: ReturnType<typeof vi.fn>;
  let mutationOptions: { onCompleted?: (data: unknown) => void; onError?: (e: Error) => void };
  let capturedDocument: DocumentNode | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    mutateFn = vi.fn();
    mutationOptions = {};
    capturedDocument = undefined;

    vi.mocked(useMutation).mockImplementation(((document?: DocumentNode, options?: MockMutationOptions) => {
      capturedDocument = document;
      mutationOptions = (options as { onCompleted?: (data: unknown) => void; onError?: (e: Error) => void }) || {};
      return [mutateFn, { loading: false }] as unknown as ReturnType<typeof useMutation>;
    }) as typeof useMutation);
  });

  it('should call mutation with the correct variables on submit', async () => {
    const { result } = renderHook(() => useNewProductLinkForm(defaultProps));

    mutateFn.mockResolvedValueOnce({ data: { addProductLink: { product: { id: 'product-1' } } } });

    await act(async () => {
      await result.current.submit({
        title: 'Test Title',
        link: 'https://example.com',
        displayLink: 'Example Display',
        iconUrl: 'https://example.com/icon.png',
      });
    });

    expect(mutateFn).toHaveBeenCalledWith({
      variables: {
        slug: 'test-slug',
        input: {
          title: 'Test Title',
          link: 'https://example.com',
          displayLink: 'Example Display',
          iconUrl: 'https://example.com/icon.png',
        },
      },
    });
  });

  it('should show success notification and reset form on mutation completed', () => {
    const { result } = renderHook(() => useNewProductLinkForm(defaultProps));

    expect(result.current).toBeDefined();

    act(() => {
      mutationOptions.onCompleted?.({ addProductLink: { product: { id: 'product-1' } } });
    });

    expect(notifications.show).toHaveBeenCalledWith({ message: '생성되었습니다.', color: 'teal' });
    expect(mockForm.reset).toHaveBeenCalled();
  });

  it('should show error notification when mutation fails', () => {
    renderHook(() => useNewProductLinkForm(defaultProps));

    act(() => {
      mutationOptions.onError?.(new Error('Network error'));
    });

    expect(notifications.show).toHaveBeenCalledWith({ message: 'Network error', color: 'red' });
  });

  it('should request links field in mutation selection instead of screenshots', () => {
    renderHook(() => useNewProductLinkForm(defaultProps));

    const docStr = capturedDocument?.loc?.source?.body || '';
    expect(docStr).toContain('links');
    expect(docStr).not.toContain('screenshots');
  });
});
