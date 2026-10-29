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
  it('preserves an unsaved human draft when the server accepts an AI candidate', () => {
    description = '<p>Original description</p>';
    const { result, rerender } = renderHook(() => useEditProductDescription({ slug: 'product-1' }));
    act(() => {
      result.current.form.getInputProps('description').onChange('<p>Unsaved human draft</p>');
    });

    description = '<p>Accepted AI candidate</p>';
    rerender();

    expect(result.current.form.getValues().description).toBe('<p>Unsaved human draft</p>');
    expect(result.current.form.isDirty()).toBe(true);
  });

  it('keeps an untouched form pristine after accepting a changed server description', () => {
    description = '<p>Original description</p>';
    const { result, rerender } = renderHook(() => useEditProductDescription({ slug: 'product-1' }));
    description = '<p>Accepted AI candidate</p>';
    rerender();

    expect(result.current.form.getValues().description).toBe(description);
    expect(result.current.form.isDirty()).toBe(false);
  });

  it('requires an explicit choice before replacing a changed server description with the draft', async () => {
    description = '<p>Original description</p>';
    const onSubmit = vi.fn();
    const { result, rerender } = renderHook(() => useEditProductDescription({ slug: 'product-1', onSubmit }));
    act(() => result.current.form.getInputProps('description').onChange('<p>Human draft</p>'));
    description = '<p>Accepted AI candidate</p>';
    rerender();

    expect(result.current.hasServerChange).toBe(true);
    await act(async () => result.current.form.onSubmit(result.current.submit)());
    expect(mutate).not.toHaveBeenCalled();

    mutate.mockRejectedValueOnce(new Error('Overwrite failed'));
    await act(async () => result.current.overwriteWithDraft());
    expect(result.current.form.getValues().description).toBe('<p>Human draft</p>');
    expect(result.current.hasServerChange).toBe(true);
    expect(result.current.saveError).toBe('Overwrite failed');
    expect(onSubmit).not.toHaveBeenCalled();

    mutate.mockResolvedValueOnce({
      data: {
        editProduct: {
          product: { id: 'product-1', description: '<p>Human draft</p>' },
        },
      },
    });
    await act(async () => result.current.overwriteWithDraft());
    expect(mutate).toHaveBeenLastCalledWith({
      variables: {
        slug: 'product-1',
        input: { description: '<p>Human draft</p>' },
      },
    });
    expect(result.current.form.isDirty()).toBe(false);
    expect(result.current.hasServerChange).toBe(false);
    expect(result.current.saveError).toBeNull();
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('replaces a draft only when the latest server description is explicitly accepted', () => {
    description = '<p>Original description</p>';
    const { result, rerender } = renderHook(() => useEditProductDescription({ slug: 'product-1' }));
    act(() => result.current.form.getInputProps('description').onChange('<p>Human draft</p>'));
    description = '<p>First candidate</p>';
    rerender();
    description = '<p>Latest candidate</p>';
    rerender();

    expect(result.current.form.getValues().description).toBe('<p>Human draft</p>');
    act(() => result.current.acceptLatestDescription());
    expect(result.current.form.getValues().description).toBe('<p>Latest candidate</p>');
    expect(result.current.form.isDirty()).toBe(false);
    expect(result.current.hasServerChange).toBe(false);

    description = '<p>Later server update</p>';
    rerender();
    expect(result.current.form.getValues().description).toBe(description);
    expect(result.current.hasServerChange).toBe(false);
  });

  it('clears the conflict and previous draft on product changes, including late save completion', async () => {
    description = '<p>Original description</p>';
    const onSubmit = vi.fn();
    const { result, rerender } = renderHook(({ slug }) => useEditProductDescription({ slug, onSubmit }), {
      initialProps: { slug: 'product-1' },
    });
    act(() => result.current.form.getInputProps('description').onChange('<p>Human draft</p>'));
    description = '<p>Accepted AI candidate</p>';
    rerender({ slug: 'product-1' });
    let finish!: (value: unknown) => void;
    mutate.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    );
    let saving!: Promise<void>;
    act(() => {
      saving = result.current.overwriteWithDraft();
    });
    rerender({ slug: 'product-2' });
    expect(result.current.form.getValues().description).toBe(description);
    expect(result.current.hasServerChange).toBe(false);
    act(() => result.current.form.getInputProps('description').onChange('<p>Second product draft</p>'));
    await act(async () => {
      finish({
        data: {
          editProduct: {
            product: { id: 'product-1', description: '<p>Human draft</p>' },
          },
        },
      });
      await saving;
    });
    expect(result.current.form.getValues().description).toBe('<p>Second product draft</p>');
    expect(onSubmit).not.toHaveBeenCalled();
  });

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
