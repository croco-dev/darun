import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { notifications } from '@mantine/notifications';
import { act, cleanup, renderHook } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

function fixture(holdWrites = false) {
  const operations: string[] = [];
  const completeWrites: (() => void)[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      operation =>
        new Observable(observer => {
          operations.push(operation.operationName ?? '');
          const complete = () => {
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
    completeWrites,
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <ApolloProvider client={client}>{children}</ApolloProvider>
    ),
  };
}

const file = new File(['image'], 'upload.png', { type: 'image/png' });
const props = { productSlug: 'parent-app', children: () => null };
const productValues = { name: '앱 A', slug: 'app-a', summary: '작성한 요약', file };
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
