import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { notifications } from '@mantine/notifications';
import { act, cleanup, renderHook } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { normalizeScreenshotImageAlt } from '../../../domain/src/usecases/ProductScreenshotMetadata';
import { useNewProductForm } from '../NewProductForm/useNewProductForm';
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function fixture(holdWrites = false, failures = 0) {
  const operations: string[] = [];
  const savedScreenshotInputs: Record<string, unknown>[] = [];
  const writeUrls: string[] = [];
  const completeWrites: (() => void)[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      operation =>
        new Observable(observer => {
          operations.push(operation.operationName ?? '');
          const complete = () => {
            if (operation.operationName !== 'GetProductScreenshotsOnDetailSection') {
              writeUrls.push(operation.variables.input.logoUrl ?? operation.variables.input.imageUrl);
              if (failures-- > 0) {
                observer.error(new Error('생성 실패 fixture'));
                return;
              }
            }
            if (operation.operationName === 'AddProductScreenshotOnNewProductScreenshotForm') {
              normalizeScreenshotImageAlt(operation.variables.input.imageAlt);
              savedScreenshotInputs.push(operation.variables.input);
            }
            observer.next({
              data:
                operation.operationName === 'GetProductScreenshotsOnDetailSection'
                  ? { tempProductBySlug: null }
                  : operation.operationName === 'CreateProductOnNewProductForm'
                    ? {
                        createProduct: {
                          product: { id: 'product-1', slug: 'saved-app' },
                        },
                      }
                    : {
                        addProductScreenshot: {
                          product: { id: 'product-1', screenshots: [] },
                        },
                      },
            });
            observer.complete();
          };
          if (holdWrites && operation.operationName !== 'GetProductScreenshotsOnDetailSection')
            completeWrites.push(complete);
          else complete();
        })
    ),
  });
  clients.push(client);
  return {
    operations,
    savedScreenshotInputs,
    writeUrls,
    completeWrites,
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <ApolloProvider client={client}>{children}</ApolloProvider>
    ),
  };
}

const file = new File(['image'], 'upload.png', { type: 'image/png' });
const props = { productSlug: 'parent-app', children: () => null };
const productValues = {
  name: '앱 A',
  slug: 'app-a',
  summary: '작성한 요약',
  file,
};
const screenshotValues = { imageAlt: '검색 화면', file };
const cases = [
  {
    name: 'product',
    useForm: () => {
      const state = useNewProductForm(props);
      return { ...state, fill: () => state.form.setValues(productValues) };
    },
    values: productValues,
    operation: 'CreateProductOnNewProductForm',
  },
  {
    name: 'screenshot',
    useForm: () => {
      const state = useNewProductScreenshotForm(props);
      return { ...state, fill: () => state.form.setValues(screenshotValues) };
    },
    values: screenshotValues,
    operation: 'AddProductScreenshotOnNewProductScreenshotForm',
  },
];

describe.each(cases)('$name upload lifetime', c => {
  it('생성 실패 뒤 같은 파일을 재전송하지 않고 성공 뒤에는 완료 URL을 초기화한다', async () => {
    upload
      .mockResolvedValueOnce('https://fixture.invalid/first.png')
      .mockResolvedValueOnce('https://fixture.invalid/new.png');
    const f = fixture(false, 1);
    const { result, unmount } = renderHook(c.useForm, { wrapper: f.wrapper });
    act(() => result.current.fill());
    await act(async () => {
      await result.current.submit(c.values);
    });
    expect(result.current.form.getValues()).toMatchObject(c.values);
    expect(result.current.loading).toBe(false);
    await act(async () => {
      await result.current.submit(c.values);
    });
    expect(upload).toHaveBeenCalledOnce();
    expect(f.writeUrls).toEqual(['https://fixture.invalid/first.png', 'https://fixture.invalid/first.png']);
    await act(async () => {
      await result.current.submit(c.values);
    });
    expect(f.writeUrls).toHaveLength(2);
    unmount();
    const next = renderHook(c.useForm, { wrapper: f.wrapper });
    act(() => next.result.current.fill());
    await act(async () => {
      await next.result.current.submit(c.values);
    });
    expect(upload).toHaveBeenCalledTimes(2);
    expect(f.writeUrls[2]).toBe('https://fixture.invalid/new.png');
  });

  it('URL 없는 업로드 실패 뒤에는 입력을 유지하고 다시 업로드한다', async () => {
    upload.mockResolvedValueOnce(undefined).mockResolvedValueOnce('https://fixture.invalid/retry.png');
    const f = fixture();
    const { result } = renderHook(c.useForm, { wrapper: f.wrapper });
    act(() => result.current.fill());
    await act(async () => {
      await result.current.submit(c.values);
    });
    expect(f.writeUrls).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.form.getValues()).toMatchObject(c.values);
    await act(async () => {
      await result.current.submit(c.values);
    });
    expect(upload).toHaveBeenCalledTimes(2);
    expect(f.writeUrls).toEqual(['https://fixture.invalid/retry.png']);
  });

  it('파일을 바꿨다가 같은 파일로 돌아와도 이전 완료 URL을 재사용하지 않는다', async () => {
    upload
      .mockResolvedValueOnce('https://fixture.invalid/first.png')
      .mockResolvedValueOnce('https://fixture.invalid/second.png');
    const f = fixture(false, 1);
    const { result } = renderHook(c.useForm, { wrapper: f.wrapper });
    act(() => result.current.fill());
    await act(async () => {
      await result.current.submit(c.values);
    });
    act(() => result.current.form.setFieldValue('file', new File(['other'], 'other.png')));
    act(() => result.current.fill());
    await act(async () => {
      await result.current.submit(c.values);
    });
    expect(upload).toHaveBeenCalledTimes(2);
    expect(f.writeUrls).toEqual(['https://fixture.invalid/first.png', 'https://fixture.invalid/second.png']);
  });

  it('업로드 중 파일을 바꾸면 늦은 완료 URL로 생성하지 않고 새 파일을 전송한다', async () => {
    const pending = deferred<string>();
    upload.mockReturnValueOnce(pending.promise).mockResolvedValueOnce('https://fixture.invalid/second.png');
    const f = fixture();
    const { result } = renderHook(c.useForm, { wrapper: f.wrapper });
    act(() => result.current.fill());
    let submitted: Promise<void>;
    act(() => {
      submitted = result.current.submit(c.values);
    });
    const other = new File(['other'], 'other.png');
    act(() => result.current.form.setFieldValue('file', other));
    await act(async () => {
      pending.resolve('https://fixture.invalid/stale.png');
      await submitted;
    });
    expect(f.writeUrls).toEqual([]);
    await act(async () => {
      await result.current.submit({ ...c.values, file: other });
    });
    expect(upload.mock.calls[1][1]).toBe(other);
    expect(f.writeUrls).toEqual(['https://fixture.invalid/second.png']);
  });

  it('does not save or navigate when an upload completes after unmount', async () => {
    const pending = deferred<string>();
    upload.mockReturnValue(pending.promise);
    const f = fixture();
    const { result, unmount } = renderHook(c.useForm, { wrapper: f.wrapper });
    let submitted: Promise<void>;
    act(() => {
      submitted = result.current.submit(c.values);
    });
    expect(result.current.loading).toBe(true);
    const signal = upload.mock.calls[0][3] as AbortSignal;
    unmount();
    expect(signal.aborted).toBe(true);
    await act(async () => {
      pending.resolve('https://fixture.invalid/late.png');
      await submitted;
    });
    expect(f.operations).toEqual([]);
    expect(navigate).not.toHaveBeenCalled();
    expect(notifications.show).not.toHaveBeenCalled();
  });

  it('ignores a late saved mutation response after the form has unmounted', async () => {
    upload.mockResolvedValue('https://fixture.invalid/uploaded.png');
    const f = fixture(true);
    const { result, unmount } = renderHook(c.useForm, { wrapper: f.wrapper });
    let submitted: Promise<void>;
    await act(async () => {
      submitted = result.current.submit(c.values);
    });
    expect(f.operations).toEqual([c.operation]);
    unmount();
    await act(async () => {
      f.completeWrites[0]();
      await submitted;
    });
    expect(f.operations).toEqual([c.operation]);
    expect(navigate).not.toHaveBeenCalled();
    expect(notifications.show).not.toHaveBeenCalled();
  });

  it('cancels only the old upload and preserves inputs while a fresh retry completes', async () => {
    const oldUpload = deferred<string>();
    const retryUpload = deferred<string>();
    upload.mockReturnValueOnce(oldUpload.promise).mockReturnValueOnce(retryUpload.promise);
    const f = fixture();
    const { result } = renderHook(c.useForm, { wrapper: f.wrapper });
    act(() => result.current.fill());
    let oldSubmit: Promise<void>;
    act(() => {
      oldSubmit = result.current.submit(c.values);
    });
    const oldSignal = upload.mock.calls[0][3] as AbortSignal;
    act(() => result.current.cancelUpload());
    expect(oldSignal.aborted).toBe(true);
    expect(result.current.loading).toBe(false);
    expect(result.current.form.getValues()).toMatchObject(c.values);
    let retrySubmit: Promise<void>;
    act(() => {
      retrySubmit = result.current.submit(c.values);
    });
    const retrySignal = upload.mock.calls[1][3] as AbortSignal;
    await act(async () => {
      oldUpload.resolve('https://fixture.invalid/old.png');
      await oldSubmit;
    });
    expect(result.current.loading).toBe(true);
    expect(retrySignal.aborted).toBe(false);
    expect(f.operations).toEqual([]);
    expect(notifications.show).not.toHaveBeenCalled();
    await act(async () => {
      retryUpload.resolve('https://fixture.invalid/retry.png');
      await retrySubmit;
    });
    expect(f.operations.filter(name => name === c.operation)).toHaveLength(1);
    expect(navigate).toHaveBeenCalledOnce();
  });

  it.each(['TimeoutError', 'Error'])('unlocks after %s and retries using the preserved file and text', async name => {
    const pending = deferred<string>();
    upload.mockReturnValueOnce(pending.promise).mockResolvedValueOnce('https://fixture.invalid/retry.png');
    const f = fixture();
    const { result } = renderHook(c.useForm, { wrapper: f.wrapper });
    act(() => result.current.fill());
    let submitted: Promise<void>;
    act(() => {
      submitted = result.current.submit(c.values);
    });
    await act(async () => {
      pending.reject(new DOMException('fixture failure', name));
      await submitted;
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.form.getValues()).toMatchObject(c.values);
    expect(f.operations).toEqual([]);
    expect(notifications.show).toHaveBeenCalledWith(expect.objectContaining({ color: 'red' }));
    await act(async () => {
      await result.current.submit(c.values);
    });
    expect(upload.mock.calls[1][1]).toBe(file);
    expect(f.operations.filter(operation => operation === c.operation)).toHaveLength(1);
    expect(navigate).toHaveBeenCalledOnce();
  });
});

function altFixture() {
  upload.mockResolvedValue('https://fixture.invalid/screen.png');
  const f = fixture();
  const hook = renderHook(() => useNewProductScreenshotForm({ ...props, productSlug: 'sample' }), {
    wrapper: f.wrapper,
  });
  return { ...hook, saved: f.savedScreenshotInputs };
}

const metadata = {
  file,
  title: '회원가입 화면',
  platform: 'IOS' as const,
  screenType: 'SIGN_UP' as const,
};

describe.each(['form', 'submit'] as const)('스크린샷 alt %s 사전 검증', entry => {
  async function send(result: ReturnType<typeof altFixture>['result'], imageAlt: string) {
    act(() => result.current.form.setValues({ ...metadata, imageAlt }));
    await act(async () => {
      if (entry === 'form') await result.current.form.onSubmit(result.current.submit)();
      else await result.current.submit(result.current.form.getValues());
    });
  }

  it.each(['', ' \t\n ', '가'.repeat(101), `  ${'a'.repeat(101)}  `])(
    '거절된 alt는 파일 전송과 저장 없이 입력을 유지하고 수정 후 같은 파일로 저장한다: %j',
    async invalid => {
      const { result, saved } = altFixture();
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
    const { result, saved } = altFixture();
    await send(result, input);
    expect(upload).toHaveBeenCalledOnce();
    expect(saved[0]?.imageAlt).toBe(expected);
    expect(navigate).toHaveBeenCalledWith('/products/sample');
  });
});

it('alt가 유효해도 제목과 분류의 기존 필드 검증을 유지한다', async () => {
  const { result, saved } = altFixture();
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

it('스크린샷 대상 폴더가 바뀌면 완료 업로드를 재사용하지 않는다', async () => {
  upload
    .mockResolvedValueOnce('https://fixture.invalid/old-folder.png')
    .mockResolvedValueOnce('https://fixture.invalid/new-folder.png');
  const f = fixture(false, 1);
  const { result, rerender } = renderHook(({ productSlug }) => useNewProductScreenshotForm({ ...props, productSlug }), {
    initialProps: { productSlug: 'first' },
    wrapper: f.wrapper,
  });
  act(() => result.current.form.setValues(screenshotValues));
  await act(async () => {
    await result.current.submit(screenshotValues);
  });
  rerender({ productSlug: 'second' });
  await act(async () => {
    await result.current.submit(screenshotValues);
  });
  expect(upload.mock.calls.map(call => call[0])).toEqual(['images/screenshots/first', 'images/screenshots/second']);
  expect(f.writeUrls).toEqual(['https://fixture.invalid/old-folder.png', 'https://fixture.invalid/new-folder.png']);
});

it('스크린샷 대상 변경 전의 지연 업로드는 생성하거나 재사용하지 않는다', async () => {
  const pending = deferred<string>();
  upload.mockReturnValueOnce(pending.promise).mockResolvedValueOnce('https://fixture.invalid/current.png');
  const f = fixture();
  const { result, rerender } = renderHook(({ productSlug }) => useNewProductScreenshotForm({ ...props, productSlug }), {
    initialProps: { productSlug: 'first' },
    wrapper: f.wrapper,
  });
  act(() => result.current.form.setValues(screenshotValues));
  let submitted: Promise<void>;
  act(() => {
    submitted = result.current.submit(screenshotValues);
  });
  rerender({ productSlug: 'second' });
  await act(async () => {
    pending.resolve('https://fixture.invalid/stale.png');
    await submitted;
  });
  expect(f.writeUrls).toEqual([]);
  await act(async () => {
    await result.current.submit(screenshotValues);
  });
  expect(upload.mock.calls[1][0]).toBe('images/screenshots/second');
  expect(f.writeUrls).toEqual(['https://fixture.invalid/current.png']);
});
