import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useEditProductInfo } from '../EditProductInfo/useEditProductInfo';
import { useNewProductForm } from '../NewProductForm/useNewProductForm';

const { upload } = vi.hoisted(() => ({ upload: vi.fn() }));
vi.mock('@darun/utils-image-upload', () => ({
  useImageUpload: () => ({ upload }),
}));
vi.mock('@darun/utils-router', () => ({ useNavigate: () => vi.fn() }));
vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn(), update: vi.fn() },
}));

const clients: ApolloClient[] = [];
afterEach(() => {
  cleanup();
  clients.splice(0).forEach(client => client.stop());
  vi.resetAllMocks();
});

function fixture() {
  const writes: Record<string, unknown>[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      operation =>
        new Observable(observer => {
          if (operation.operationName?.startsWith('TempProductBySlug')) {
            observer.next({
              data: {
                tempProductBySlug: {
                  id: 'product-1',
                  name: '기존 이름',
                  summary: '기존 요약',
                },
              },
            });
          } else {
            writes.push(operation.variables);
            const product = {
              id: 'product-1',
              slug: 'text-limit',
              ...operation.variables.input,
            };
            observer.next({
              data:
                operation.operationName === 'CreateProductOnNewProductForm'
                  ? { createProduct: { product } }
                  : { editProduct: { product } },
            });
          }
          observer.complete();
        })
    ),
  });
  clients.push(client);
  return {
    writes,
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <ApolloProvider client={client}>{children}</ApolloProvider>
    ),
  };
}

describe.each(['name', 'summary'] as const)('%s 길이 검증', field => {
  it('신규 폼은 256자 입력과 파일을 보존하고 업로드·mutation 전에 필드 오류를 표시한다', async () => {
    const f = fixture();
    const { result } = renderHook(() => useNewProductForm({ children: () => null }), { wrapper: f.wrapper });
    const file = new File(['image'], 'logo.png', { type: 'image/png' });
    const values = {
      name: '서비스',
      summary: '요약',
      slug: 'text-limit',
      file,
      [field]: '한'.repeat(256),
    };
    act(() => result.current.form.setValues(values));
    await act(async () => {
      await result.current.submit(values);
    });
    expect(result.current.form.errors[field]).toBeTruthy();
    expect(result.current.form.getValues()).toMatchObject(values);
    expect(upload).not.toHaveBeenCalled();
    expect(f.writes).toEqual([]);
    const fixed = { ...values, [field]: '😀'.repeat(255) };
    upload.mockResolvedValue('https://example.com/logo.png');
    act(() => result.current.form.setValues(fixed));
    await act(async () => {
      await result.current.form.onSubmit(result.current.submit)();
    });
    expect(upload).toHaveBeenCalledOnce();
    expect(f.writes).toHaveLength(1);
    expect(f.writes[0].input).toMatchObject({ [field]: fixed[field] });
  });

  it('편집 폼은 초과 입력을 보존하고 같은 폼에서 수정 후 재시도한다', async () => {
    const f = fixture();
    const { result } = renderHook(() => useEditProductInfo({ slug: 'text-limit' }), { wrapper: f.wrapper });
    await waitFor(() => expect(result.current.form.getValues().name).toBe('기존 이름'));
    const values = {
      name: '수정 이름',
      summary: '수정 요약',
      [field]: '😀'.repeat(256),
    };
    act(() => result.current.form.setValues(values));
    await act(async () => {
      await result.current.submit(values);
    });
    expect(result.current.form.errors[field]).toBeTruthy();
    expect(result.current.form.getValues()).toMatchObject(values);
    expect(f.writes).toEqual([]);
    const fixed = { ...values, [field]: '😀'.repeat(255) };
    act(() => result.current.form.setValues(fixed));
    await act(async () => {
      await result.current.form.onSubmit(result.current.submit)();
    });
    expect(f.writes).toHaveLength(1);
    expect(f.writes[0].input).toMatchObject(fixed);
  });
});

describe('신규 상품 slug 검증', () => {
  it.each(['My_Product', 'a--b', 'a'.repeat(101), 'two words'])(
    '%s는 파일을 보존하고 업로드 전에 거절한다',
    async slug => {
      const f = fixture();
      const { result } = renderHook(() => useNewProductForm({ children: () => null }), { wrapper: f.wrapper });
      const file = new File(['image'], 'logo.png', { type: 'image/png' });
      const values = { name: '서비스', summary: '요약', slug, file };
      act(() => result.current.form.setValues(values));
      expect(result.current.form.validate().hasErrors).toBe(true);
      await act(async () => {
        await result.current.submit(values);
      });
      expect(result.current.form.errors.slug).toBeTruthy();
      expect(result.current.form.getValues()).toMatchObject(values);
      expect(upload).not.toHaveBeenCalled();
      expect(f.writes).toEqual([]);
      const fixed = { ...values, slug: 'a'.repeat(100) };
      upload.mockResolvedValue('https://example.com/logo.png');
      act(() => result.current.form.setValues(fixed));
      await act(async () => {
        await result.current.form.onSubmit(result.current.submit)();
      });
      expect(upload).toHaveBeenCalledOnce();
      expect(f.writes[0].input).toMatchObject({ slug: fixed.slug });
    }
  );
});
