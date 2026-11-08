import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { act, cleanup, renderHook } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { normalizeScreenshotImageAlt } from '../../../domain/src/usecases/ProductScreenshotMetadata';
import { useNewProductScreenshotForm } from '../NewProductScreenshotForm/useNewProductScreenshotForm';

const { upload, navigate } = vi.hoisted(() => ({
  upload: vi.fn(),
  navigate: vi.fn(),
}));
vi.mock('@darun/utils-image-upload', () => ({
  useImageUpload: () => ({ upload }),
}));
vi.mock('@darun/utils-router', () => ({ useNavigate: () => navigate }));
vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn(), update: vi.fn() },
}));

const clients: ApolloClient[] = [];
afterEach(async () => {
  cleanup();
  await act(async () => clients.splice(0).forEach(client => client.stop()));
  vi.resetAllMocks();
});

function fixture() {
  const saved: Record<string, unknown>[] = [];
  upload.mockResolvedValue('https://fixture.invalid/screen.png');
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      operation =>
        new Observable(observer => {
          if (operation.operationName === 'AddProductScreenshotOnNewProductScreenshotForm') {
            const input = operation.variables.input;
            normalizeScreenshotImageAlt(input.imageAlt);
            saved.push(input);
            observer.next({
              data: {
                addProductScreenshot: {
                  product: { id: 'product-1', screenshots: [] },
                },
              },
            });
          } else if (operation.operationName === 'GetProductScreenshotsOnDetailSection') {
            observer.next({ data: { tempProductBySlug: null } });
          } else {
            observer.error(new Error(`Unexpected operation: ${operation.operationName}`));
            return;
          }
          observer.complete();
        })
    ),
  });
  clients.push(client);
  const hook = renderHook(
    () =>
      useNewProductScreenshotForm({
        productSlug: 'sample',
        children: () => null,
      }),
    {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <ApolloProvider client={client}>{children}</ApolloProvider>
      ),
    }
  );
  return { ...hook, saved };
}

const file = new File(['screen'], 'screen.png', { type: 'image/png' });
const metadata = {
  file,
  title: '회원가입 화면',
  platform: 'IOS' as const,
  screenType: 'SIGN_UP' as const,
};

describe.each(['form', 'submit'] as const)('스크린샷 alt %s 사전 검증', entry => {
  async function send(result: ReturnType<typeof fixture>['result'], imageAlt: string) {
    act(() => result.current.form.setValues({ ...metadata, imageAlt }));
    await act(async () => {
      if (entry === 'form') await result.current.form.onSubmit(result.current.submit)();
      else await result.current.submit(result.current.form.getValues());
    });
  }

  it.each(['', ' \t\n ', '가'.repeat(101), `  ${'a'.repeat(101)}  `])(
    '거절된 alt는 파일 전송과 저장 없이 입력을 유지하고 수정 후 같은 파일로 저장한다: %j',
    async invalid => {
      const { result, saved } = fixture();
      await send(result, invalid);
      expect(result.current.form.errors.imageAlt).toBeTruthy();
      expect(upload).not.toHaveBeenCalled();
      expect(saved).toEqual([]);
      expect(navigate).not.toHaveBeenCalled();
      expect(result.current.loading).toBe(false);
      expect(result.current.form.getValues()).toEqual({
        ...metadata,
        imageAlt: invalid,
      });

      await send(result, '  수정한 설명  ');
      expect(upload).toHaveBeenCalledOnce();
      expect(upload.mock.calls[0][1]).toBe(file);
      expect(saved).toEqual([
        {
          imageUrl: 'https://fixture.invalid/screen.png',
          imageAlt: '수정한 설명',
          title: metadata.title,
          platform: 'IOS',
          screenType: 'SIGN_UP',
        },
      ]);
      expect(navigate).toHaveBeenCalledWith('/products/sample');
    }
  );

  it.each([
    ['가', '가'],
    ['a'.repeat(100), 'a'.repeat(100)],
    [` \t${'가'.repeat(100)}\n `, '가'.repeat(100)],
  ])('trim 후 1~100자를 서버 검증까지 그대로 저장한다', async (input, expected) => {
    const { result, saved } = fixture();
    await send(result, input);
    expect(upload).toHaveBeenCalledOnce();
    expect(saved[0]?.imageAlt).toBe(expected);
    expect(navigate).toHaveBeenCalledWith('/products/sample');
  });
});

it('alt가 유효해도 제목과 분류의 기존 필드 검증을 유지한다', async () => {
  const { result, saved } = fixture();
  act(() =>
    result.current.form.setValues({
      ...metadata,
      imageAlt: '화면',
      title: 'a'.repeat(101),
    })
  );
  await act(async () => {
    await result.current.form.onSubmit(result.current.submit)();
  });
  expect(result.current.form.errors.title).toBeTruthy();
  expect(upload).not.toHaveBeenCalled();
  act(() => {
    result.current.form.setFieldValue('title', metadata.title);
    result.current.form.getInputProps('platform').onChange('invalid');
    result.current.form.getInputProps('screenType').onChange('invalid');
  });
  await act(async () => {
    await result.current.form.onSubmit(result.current.submit)();
  });
  expect(result.current.form.errors.platform).toBeTruthy();
  expect(result.current.form.errors.screenType).toBeTruthy();
  expect(saved).toEqual([]);
});
