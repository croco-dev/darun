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

  it('settles with the real Mantine form without an initialization render loop', () => {
    let renders = 0;
    const { result } = renderHook(() => {
      if (++renders > 20) throw new Error('Link form initialization does not settle');
      return useEditProductLinkItem(defaultProps);
    });
    expect(result.current.form.getValues()).toEqual({
      title: defaultProps.link.title,
      link: defaultProps.link.link,
      displayLink: defaultProps.link.displayLink,
      iconUrl: defaultProps.link.iconUrl,
    });
  });

  it('keeps the draft for the same link across parent renders and mutation loading changes', () => {
    const { result, rerender } = renderHook(props => useEditProductLinkItem(props), {
      initialProps: defaultProps,
    });
    act(() => result.current.form.setFieldValue('title', 'Draft title'));
    rerender({ ...defaultProps, link: { ...defaultProps.link, title: 'Refetched title' } });
    expect(result.current.form.getValues().title).toBe('Draft title');
    vi.mocked(useMutation).mockReturnValue([mutateFn, { loading: true }] as unknown as ReturnType<typeof useMutation>);
    rerender({ ...defaultProps });
    expect(result.current.loading).toBe(true);
    expect(result.current.form.getValues().title).toBe('Draft title');
    vi.mocked(useMutation).mockReturnValue([mutateFn, { loading: false }] as unknown as ReturnType<typeof useMutation>);
    rerender({ ...defaultProps });
    expect(result.current.form.getValues().title).toBe('Draft title');
  });

  it('initializes a different link and submits its current draft with the new identity', async () => {
    const { result, rerender } = renderHook(props => useEditProductLinkItem(props), {
      initialProps: defaultProps,
    });
    act(() => result.current.form.setFieldValue('title', 'Old draft'));
    const updatedLink = {
      ...defaultProps.link,
      id: 'link-2',
      title: 'New Link Title',
      link: 'https://newlink.com',
    };

    rerender({ ...defaultProps, link: updatedLink });

    expect(result.current.form.getValues()).toEqual({
      title: updatedLink.title,
      link: updatedLink.link,
      displayLink: updatedLink.displayLink,
      iconUrl: updatedLink.iconUrl,
    });
    act(() => result.current.form.setFieldValue('title', 'New draft'));
    rerender({ ...defaultProps, link: { ...updatedLink } });
    expect(result.current.form.getValues().title).toBe('New draft');
    await act(async () => result.current.submit(result.current.form.getValues()));
    expect(mutateFn).toHaveBeenCalledWith({
      variables: {
        slug: defaultProps.slug,
        id: updatedLink.id,
        input: {
          title: 'New draft',
          link: updatedLink.link,
          displayLink: updatedLink.displayLink,
          iconUrl: updatedLink.iconUrl,
        },
      },
    });
  });

  it('initializes when switching products even if the link identifier is reused', () => {
    const { result, rerender } = renderHook(props => useEditProductLinkItem(props), { initialProps: defaultProps });
    act(() => result.current.form.setFieldValue('title', 'Old product draft'));
    rerender({ ...defaultProps, slug: 'another-product', link: { ...defaultProps.link, title: 'Other product' } });
    expect(result.current.form.getValues().title).toBe('Other product');
  });

  it('rejects submissions when all fields are empty or whitespace only', async () => {
    const { result } = renderHook(() => useEditProductLinkItem(defaultProps));

    await act(async () => {
      await result.current.submit({
        title: '   ',
        link: '   ',
        displayLink: '',
        iconUrl: '',
      });
    });

    expect(notifications.show).toHaveBeenCalledWith({
      message: '모든 값이 비어있을 수는 없습니다.',
      color: 'red',
    });
    expect(mutateFn).not.toHaveBeenCalled();
  });

  it('rejects invalid link protocol and alerts user', async () => {
    const { result } = renderHook(() => useEditProductLinkItem(defaultProps));

    await act(async () => {
      await result.current.submit({
        title: 'Blog',
        link: 'javascript:alert(1)',
        displayLink: 'Blog',
        iconUrl: 'https://example.com/icon.png',
      });
    });

    expect(notifications.show).toHaveBeenCalledWith({
      message: '올바른 URL 형식(http:// 또는 https://)으로 입력해주세요.',
      color: 'red',
    });
    expect(mutateFn).not.toHaveBeenCalled();
  });
});
