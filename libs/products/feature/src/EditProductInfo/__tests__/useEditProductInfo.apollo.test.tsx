import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { TempProductBySlugOnEditProductInfoDocument } from '@darun/provider-graphql';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { EditProductInfo } from '../EditProductInfo';
import { useEditProductInfo } from '../useEditProductInfo';

vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));

const product = {
  id: 'product-1',
  name: '기존 이름',
  summary: '보존할 기존 요약',
  logoUrl: 'https://example.com/current.png',
};
const clients: ApolloClient[] = [];

afterEach(() => {
  cleanup();
  clients.splice(0).forEach(client => client.stop());
});

function fixture() {
  const reads: ((result: typeof product | null | Error) => void)[] = [];
  const writes: Record<string, unknown>[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      operation =>
        new Observable(observer => {
          if (operation.operationName === 'EditProductOnEditProductInfo') {
            writes.push(operation.variables);
            observer.next({ data: { editProduct: { product: { ...product, ...operation.variables.input } } } });
            observer.complete();
            return;
          }

          reads.push(result => {
            if (result instanceof Error) {
              observer.error(result);
              return;
            }

            observer.next({ data: { tempProductBySlug: result } });
            observer.complete();
          });
        })
    ),
  });
  clients.push(client);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ApolloProvider client={client}>{children}</ApolloProvider>
  );
  return { client, wrapper, reads, writes };
}

function mount() {
  const { client, wrapper, reads, writes } = fixture();
  const hook = renderHook(({ slug }) => useEditProductInfo({ slug }), {
    initialProps: { slug: 'sample' },
    wrapper,
  });
  return { ...hook, client, reads, writes };
}

it.each([
  ['first lookup is pending', undefined, 'loading'],
  ['first lookup failed', new Error('lookup failed'), 'error'],
  ['product does not exist', null, 'missing'],
] as const)('blocks direct submit when the %s', async (_state, response, readState) => {
  const { result, reads, writes } = mount();
  await waitFor(() => expect(reads).toHaveLength(1));
  if (response !== undefined) await act(async () => reads[0](response));

  await act(async () => {
    void result.current.submit({ name: '이름만 수정' });
  });

  expect(writes).toEqual([]);
  expect(result.current.readState).toBe(readState);
});

it.each([
  ['error', new Error('lookup failed')],
  ['missing', null],
] as const)('keeps saving blocked when the cache changes after a lookup reports %s', async (readState, response) => {
  const { result, client, reads, writes } = mount();
  await waitFor(() => expect(reads).toHaveLength(1));
  await act(async () => reads[0](response));
  expect(result.current.readState).toBe(readState);

  await act(async () => {
    const cachedProduct = { ...product, __typename: 'Product', summary: '' };
    client.writeQuery({
      query: TempProductBySlugOnEditProductInfoDocument,
      variables: { slug: 'sample' },
      data: { tempProductBySlug: cachedProduct },
    });
  });
  await act(async () => {
    void result.current.submit({ name: '이름만 수정' });
  });

  expect(writes).toEqual([]);
  expect(result.current.readState).toBe(readState);
});

it('initializes from the retried read and allows intentionally clearing the summary', async () => {
  const { result, reads, writes } = mount();
  await waitFor(() => expect(reads).toHaveLength(1));
  await act(async () => reads[0](new Error('lookup failed')));
  expect(result.current.readState).toBe('error');

  await act(async () => {
    void result.current.retryRead();
  });
  await waitFor(() => expect(reads).toHaveLength(2));
  expect(result.current.readState).toBe('loading');
  await act(async () => reads[1](product));
  expect(result.current.readState).toBe('ready');
  expect(result.current.form.getValues()).toEqual({
    name: product.name,
    summary: product.summary,
    logoUrl: product.logoUrl,
  });

  await act(async () => {
    void result.current.submit({ name: product.name, summary: '' });
  });
  expect(writes).toEqual([{ slug: 'sample', input: { name: product.name, summary: '' } }]);
});

it('requires the selected product to load before submitting after a slug change', async () => {
  const { result, reads, writes, rerender } = mount();
  await waitFor(() => expect(reads).toHaveLength(1));
  await act(async () => reads[0](product));
  expect(result.current.readState).toBe('ready');
  act(() => result.current.form.setValues({ name: '저장하지 않은 이전 상품 입력' }));

  rerender({ slug: 'next-product' });
  await waitFor(() => expect(reads).toHaveLength(2));
  await act(async () => {
    void result.current.submit(result.current.form.getValues());
  });
  expect(writes).toEqual([]);

  await act(async () => reads[1]({ ...product, id: 'product-2' }));
  expect(result.current.readState).toBe('ready');
  expect(result.current.form.getValues()).toEqual({
    name: product.name,
    summary: product.summary,
    logoUrl: product.logoUrl,
  });
});

it.each([
  [' https://example.com/new.png ', 'https://example.com/new.png'],
  ['', ''],
] as const)('sends the changed logo %j with the existing basic info', async (input, logoUrl) => {
  const { result, reads, writes } = mount();
  await waitFor(() => expect(reads).toHaveLength(1));
  await act(async () => reads[0](product));
  await act(async () => {
    void result.current.submit({ ...result.current.form.getValues(), logoUrl: input });
  });
  expect(writes).toEqual([{ slug: 'sample', input: { name: product.name, summary: product.summary, logoUrl } }]);
});

it('returns focus to retry after another error and to the name input after recovery', async () => {
  const { reads, wrapper } = fixture();
  const { container } = render(<EditProductInfo slug="sample" />, { wrapper });
  await waitFor(() => expect(reads).toHaveLength(1));
  await act(async () => reads[0](new Error('lookup failed')));
  const retry = () => screen.getByRole('button', { name: '다시 불러오기' });
  retry().focus();
  fireEvent.click(retry());
  expect(container.contains(document.activeElement)).toBe(true);

  await waitFor(() => expect(reads).toHaveLength(2));
  await act(async () => reads[1](new Error('lookup failed again')));
  await waitFor(() => expect(document.activeElement).toBe(retry()));
  fireEvent.click(retry());

  await waitFor(() => expect(reads).toHaveLength(3));
  await act(async () => reads[2](product));
  const name = screen.getByRole('textbox', { name: /^서비스 이름$/ });
  await waitFor(() => expect(document.activeElement).toBe(name));
});
