import type { OperationVariables } from '@apollo/client';
import { useQuery, useMutation } from '@apollo/client/react';
import { notifications } from '@mantine/notifications';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useEditProductDescription } from '../useEditProductDescription';

vi.mock('@apollo/client/react', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn() },
}));

const mutate = vi.fn();
let description: string | null | undefined;

beforeEach(() => {
  vi.clearAllMocks();
  description = undefined;
  vi.mocked(useQuery).mockImplementation(
    () =>
      ({
        data: description === undefined ? undefined : { tempProductBySlug: { id: 'product-1', description } },
      }) as useQuery.Result<
        unknown,
        OperationVariables,
        'empty' | 'complete' | 'streaming',
        Partial<OperationVariables>
      >
  );
  vi.mocked(useMutation).mockReturnValue([mutate, { loading: false }] as unknown as useMutation.ResultTuple<
    unknown,
    OperationVariables
  >);
  mutate.mockResolvedValue({});
});

describe('description form synchronization', () => {
  it.each([null, '<p>Existing description</p>'])(
    'submits the edited description after rerenders when the loaded value is %s',
    async loadedDescription => {
      description = loadedDescription;
      const { result, rerender } = renderHook(() => useEditProductDescription({ slug: 'product-1' }));
      const editedDescription = '<p>Edited description</p>';

      act(() => {
        result.current.form.getInputProps('description').onChange(editedDescription);
      });
      rerender();

      expect(result.current.form.getValues().description).toBe(editedDescription);
      await act(async () => {
        await result.current.form.onSubmit(result.current.submit)();
      });
      expect(mutate).toHaveBeenCalledWith({
        variables: {
          slug: 'product-1',
          input: { description: editedDescription },
        },
      });
      expect(notifications.show).not.toHaveBeenCalled();
    }
  );

  it('loads a description that arrives after the form mounts', () => {
    const { result, rerender } = renderHook(() => useEditProductDescription({ slug: 'product-1' }));
    description = '<p>Loaded asynchronously</p>';
    rerender();

    expect(result.current.form.getValues().description).toBe(description);
    expect(result.current.form.isDirty()).toBe(false);
  });

  it('discards the previous product draft when switching products with the same loaded description', () => {
    description = '<p>Shared description</p>';
    const { result, rerender } = renderHook(({ slug }) => useEditProductDescription({ slug }), {
      initialProps: { slug: 'product-1' },
    });
    act(() => {
      result.current.form.getInputProps('description').onChange('<p>First product draft</p>');
    });
    rerender({ slug: 'product-2' });

    expect(result.current.form.getValues().description).toBe(description);
  });
});

describe('description validation', () => {
  it('너무 큰 표는 직접 submit에서도 전송하지 않고 원문을 유지한다', async () => {
    const { result } = renderHook(() => useEditProductDescription({ slug: 'product-1' }));
    const html = '<table><tr><td colspan="600">A</td><td colspan="401">B</td></tr></table>';
    act(() => result.current.form.getInputProps('description').onChange(html));
    await act(async () => result.current.submit({ description: html }));
    expect(mutate).not.toHaveBeenCalled();
    expect(result.current.saveError).toBeTruthy();
    expect(result.current.form.getValues().description).toBe(html);
  });

  it.each(['', '<p>   <br>  </p>'])('rejects an empty description: %s', async value => {
    const { result } = renderHook(() => useEditProductDescription({ slug: 'product-1' }));
    await act(async () => {
      await result.current.submit({ description: value });
    });

    expect(mutate).not.toHaveBeenCalled();
    expect(notifications.show).toHaveBeenCalledWith(expect.objectContaining({ color: 'red' }));
  });

  it('accepts a description containing an image without text', async () => {
    const { result } = renderHook(() => useEditProductDescription({ slug: 'product-1' }));
    await act(async () => {
      await result.current.submit({
        description: '<p><img src="https://example.com/image.png"></p>',
      });
    });

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(notifications.show).not.toHaveBeenCalled();
  });

  it('shows failed save without completing or clearing the edited form', async () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() => useEditProductDescription({ slug: 'product-1', onSubmit }));
    mutate.mockRejectedValueOnce(new Error('Network error'));

    act(() => {
      result.current.form.getInputProps('description').onChange('<p>Draft</p>');
    });
    await act(async () => {
      await result.current.submit({ description: '<p>Draft</p>' });
    });
    expect(result.current.saveError).toBe('Network error');
    expect(result.current.form.getValues().description).toBe('<p>Draft</p>');
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
