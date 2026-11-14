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
let descriptionError: Error | undefined;

beforeEach(() => {
  vi.clearAllMocks();
  mutate.mockReset();
  description = undefined;
  descriptionError = undefined;
  vi.mocked(useQuery).mockImplementation(
    () =>
      ({
        data: description === undefined ? undefined : { tempProductBySlug: { id: 'product-1', description } },
        error: descriptionError,
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
  it('업로드 시작과 같은 이벤트의 submit과 덮어쓰기도 막고 완료 후 저장한다', async () => {
    const draft = '<p>저장할 초안</p>';
    description = draft;
    const { result } = renderHook(() => useEditProductDescription({ slug: 'product-1' }));
    await act(async () => {
      result.current.onImageUploadingChange(true);
      await result.current.submit({ description: draft });
      await result.current.overwriteWithDraft();
    });
    expect(mutate).not.toHaveBeenCalled();
    await act(async () => {
      result.current.onImageUploadingChange(false);
      await result.current.submit({ description: draft });
    });
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it('상품 폼이 종료된 뒤 이전 저장 성공으로 완료 알림을 보내지 않는다', async () => {
    description = '<p>기존 상품</p>';
    let complete!: (value: unknown) => void;
    mutate.mockReturnValueOnce(new Promise(resolve => (complete = resolve)));
    const onSubmit = vi.fn();
    const { result, unmount } = renderHook(() => useEditProductDescription({ slug: 'product-1', onSubmit }));
    let saving!: Promise<void>;
    act(() => {
      saving = result.current.submit({ description: '<p>기존 상품</p>' });
    });
    unmount();
    await act(async () => {
      complete({
        data: {
          editProduct: {
            product: { id: 'product-1', description: '<p>기존 상품</p>' },
          },
        },
      });
      await saving;
    });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(notifications.show).not.toHaveBeenCalled();
  });

  it('너무 큰 표는 직접 submit에서도 전송하지 않고 원문을 유지한다', async () => {
    description = '<p>기존 소개</p>';
    const { result } = renderHook(() => useEditProductDescription({ slug: 'product-1' }));
    const html = '<table><tr><td colspan="600">A</td><td colspan="401">B</td></tr></table>';
    act(() => result.current.form.getInputProps('description').onChange(html));
    await act(async () => result.current.submit({ description: html }));
    expect(mutate).not.toHaveBeenCalled();
    expect(result.current.saveError).toBeTruthy();
    expect(result.current.form.getValues().description).toBe(html);
  });

  it.each(['', '<p> &nbsp;<br> </p>'])('기존 설명을 지운 편집 값 %j을 빈 문자열로 저장한다', async value => {
    description = '<p>기존 소개</p>';
    const { result } = renderHook(() => useEditProductDescription({ slug: 'product-1' }));
    act(() => result.current.form.getInputProps('description').onChange(value));
    await act(async () => result.current.form.onSubmit(result.current.submit)());

    expect(mutate).toHaveBeenCalledExactlyOnceWith({
      variables: { slug: 'product-1', input: { description: '' } },
    });
  });

  it('기존 설명을 읽기 전에는 빈 편집 값을 전송하지 않는다', async () => {
    const { result } = renderHook(() => useEditProductDescription({ slug: 'product-1' }));
    await act(async () => result.current.form.onSubmit(result.current.submit)());

    expect(mutate).not.toHaveBeenCalled();
  });

  it('설명 조회에 실패하면 이전 응답이 남아 있어도 빈 편집 값을 전송하지 않는다', async () => {
    description = '<p>기존 소개</p>';
    descriptionError = new Error('조회 실패');
    const { result } = renderHook(() => useEditProductDescription({ slug: 'product-1' }));
    await act(async () => result.current.submit({ description: '<p></p>' }));

    expect(mutate).not.toHaveBeenCalled();
  });

  it('설명 삭제 저장에 실패하면 비운 상태를 유지하고 다시 저장할 수 있다', async () => {
    description = '<p>기존 소개</p>';
    const onSubmit = vi.fn();
    const { result } = renderHook(() => useEditProductDescription({ slug: 'product-1', onSubmit }));
    const emptyParagraph = '<p></p>';
    mutate.mockRejectedValueOnce(new Error('저장 실패')).mockResolvedValueOnce({
      data: { editProduct: { product: { id: 'product-1', description: '' } } },
    });

    act(() => result.current.form.getInputProps('description').onChange(emptyParagraph));
    await act(async () => result.current.form.onSubmit(result.current.submit)());
    expect(result.current.saveError).toBe('저장 실패');
    expect(result.current.form.getValues().description).toBe(emptyParagraph);
    expect(onSubmit).not.toHaveBeenCalled();

    await act(async () => result.current.form.onSubmit(result.current.submit)());
    expect(mutate.mock.calls).toEqual([
      [{ variables: { slug: 'product-1', input: { description: '' } } }],
      [{ variables: { slug: 'product-1', input: { description: '' } } }],
    ]);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it.each(['<p><img src="https://example.com/image.png"></p>', '<hr>', '<table><tr><td></td></tr></table>'])(
    '글자가 없어도 이미지나 문서 구조가 있으면 원문 %j을 저장한다',
    async draft => {
      description = null;
      const { result } = renderHook(() => useEditProductDescription({ slug: 'product-1' }));
      await act(async () => result.current.submit({ description: draft }));
      expect(mutate).toHaveBeenCalledExactlyOnceWith({
        variables: { slug: 'product-1', input: { description: draft } },
      });
      expect(notifications.show).not.toHaveBeenCalled();
    }
  );

  it('shows failed save without completing or clearing the edited form', async () => {
    description = null;
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
