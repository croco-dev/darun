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
  setValues: vi.fn(),
  setInitialValues: vi.fn(),
  getInputProps: vi.fn(() => ({ key: 'test-form-key', defaultValue: '' })),
  onSubmit: vi.fn((handler: (values: Record<string, string>) => Promise<void>) => handler),
};

vi.mock('@mantine/form', () => ({
  useForm: vi.fn(() => mockForm),
}));

vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn() },
}));

import { useEditProductLinkItem } from '../useEditProductLinkItem';

describe('useEditProductLinkItem', () => {
  const defaultProps = {
    slug: 'test-product',
    link: {
      id: 'link-1',
      title: 'Test Link',
      link: 'https://example.com',
      displayLink: 'Example',
      iconUrl: 'https://example.com/icon.png',
      __typename: 'Link' as const,
    },
  };
  type MockMutationOptions = MutationHookOptions<unknown, Record<string, unknown>, unknown, ApolloCache>;
  let mutateFn: ReturnType<typeof vi.fn>;
  let mutationOptions: { onCompleted?: (data: unknown) => void; onError?: (e: Error) => void };

  beforeEach(() => {
    vi.clearAllMocks();
    mutateFn = vi.fn();
    mutationOptions = {};

    vi.mocked(useMutation).mockImplementation(((_document?: DocumentNode, options?: MockMutationOptions) => {
      mutationOptions = (options as { onCompleted?: (data: unknown) => void; onError?: (e: Error) => void }) || {};
      mutateFn.mockImplementation(async () => {
        const data = { updateProductLink: { product: { id: 'product-1' } } };
        mutationOptions.onCompleted?.(data);
        return { data };
      });
      return [mutateFn, { loading: false }] as unknown as ReturnType<typeof useMutation>;
    }) as typeof useMutation);
  });

  it('should show error notification via onError when mutation fails', () => {
    renderHook(() => useEditProductLinkItem(defaultProps));

    act(() => {
      mutationOptions.onError?.(new Error('Network error'));
    });

    expect(notifications.show).toHaveBeenCalledWith({ message: 'Network error', color: 'red' });
  });

  it('should call mutation with the correct variables and show success notification and call onSubmit', async () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() => useEditProductLinkItem({ ...defaultProps, onSubmit }));

    await act(async () => {
      await result.current.submit({
        title: 'Updated Title',
        link: 'https://updated.com',
        displayLink: 'Updated',
        iconUrl: 'https://updated.com/icon.png',
      });
    });

    expect(mutateFn).toHaveBeenCalledWith({
      variables: {
        slug: defaultProps.slug,
        id: defaultProps.link.id,
        input: {
          title: 'Updated Title',
          link: 'https://updated.com',
          displayLink: 'Updated',
          iconUrl: 'https://updated.com/icon.png',
        },
      },
    });
    expect(notifications.show).toHaveBeenCalledWith({ message: '수정되었습니다.', color: 'teal' });
    expect(onSubmit).toHaveBeenCalled();
  });

  it('should not show success notification or call onSubmit when mutation fails', async () => {
    const onSubmit = vi.fn();
    mutateFn.mockImplementationOnce(async () => {
      const error = new Error('Network error');
      mutationOptions.onError?.(error);
      throw error;
    });

    const { result } = renderHook(() => useEditProductLinkItem({ ...defaultProps, onSubmit }));

    await act(async () => {
      await result.current.submit({
        title: 'Updated',
        link: 'https://example.com',
        displayLink: 'Example',
        iconUrl: 'https://example.com/icon.png',
      });
    });

    expect(notifications.show).toHaveBeenCalledWith({ message: 'Network error', color: 'red' });
    expect(notifications.show).not.toHaveBeenCalledWith({ message: '수정되었습니다.', color: 'teal' });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should sync form values when link prop updates', () => {
    const { rerender } = renderHook(props => useEditProductLinkItem(props), {
      initialProps: defaultProps,
    });

    expect(mockForm.setValues).toHaveBeenCalledWith({
      title: defaultProps.link.title,
      link: defaultProps.link.link,
      displayLink: defaultProps.link.displayLink,
      iconUrl: defaultProps.link.iconUrl,
    });

    const updatedLink = {
      ...defaultProps.link,
      title: 'New Link Title',
      link: 'https://newlink.com',
    };

    rerender({ ...defaultProps, link: updatedLink });

    expect(mockForm.setValues).toHaveBeenCalledWith({
      title: updatedLink.title,
      link: updatedLink.link,
      displayLink: updatedLink.displayLink,
      iconUrl: updatedLink.iconUrl,
    });
  });
});
