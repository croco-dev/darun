// @vitest-environment jsdom
import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { notifications } from '@mantine/notifications';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { ProductDetailScreenshotSection } from '../features/products/ProductDetailScreenshotSection/ProductDetailScreenshotSection';

vi.mock('@darun/utils-router', () => ({
  Link: (props: React.ComponentProps<'a'>) => <a {...props} />,
}));
vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));

const clients: ApolloClient[] = [];
afterEach(() => {
  cleanup();
  clients.splice(0).forEach(client => client.stop());
  vi.restoreAllMocks();
});

function mountSection() {
  const screenshots = ['A', 'B'].map(id => ({
    __typename: 'ProductScreenshot',
    id,
    imageUrl: `https://fixture.invalid/${id}.png`,
    imageAlt: `Saved alt ${id}`,
    title: `Saved title ${id}`,
    platform: 'WEB',
    screenType: 'HOME',
  }));
  const queries: ((fail?: boolean) => void)[] = [];
  const writes: Record<string, unknown>[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      operation =>
        new Observable(observer => {
          if (operation.operationName === 'GetProductScreenshotsOnDetailSection') {
            queries.push(fail => {
              if (fail) return observer.error(new Error('Screenshot lookup unavailable'));
              observer.next({
                data: {
                  tempProductBySlug: {
                    __typename: 'Product',
                    id: 'product',
                    screenshots: structuredClone(screenshots),
                  },
                },
              });
              observer.complete();
            });
          } else if (operation.operationName === 'DeleteProductScreenshotOnDetailSection') {
            screenshots.splice(
              screenshots.findIndex(screenshot => screenshot.id === operation.variables.id),
              1
            );
            observer.next({
              data: { deleteProductScreenshot: { success: true } },
            });
            observer.complete();
          } else if (operation.operationName === 'UpdateProductScreenshotOnDetailSection') {
            writes.push(structuredClone(operation.variables));
            const screenshot = screenshots.find(item => item.id === operation.variables.id)!;
            Object.assign(screenshot, operation.variables);
            observer.next({
              data: {
                updateProductScreenshot: { screenshot: { ...screenshot } },
              },
            });
            observer.complete();
          } else observer.error(new Error(`Unexpected operation: ${operation.operationName}`));
        })
    ),
  });
  clients.push(client);
  render(
    <ApolloProvider client={client}>
      <ProductDetailScreenshotSection slug="fixture-product" />
    </ApolloProvider>
  );
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  return { queries, writes };
}

async function finishQuery(queries: ((fail?: boolean) => void)[], fail = false) {
  await waitFor(() => expect(queries.length).toBeGreaterThan(0));
  await act(async () => queries.shift()!(fail));
}

function card(id: string) {
  return screen.getByText(`Saved alt ${id}`, { selector: 'span[title]' }).closest('.group') as HTMLElement;
}

async function editA(queries: ((fail?: boolean) => void)[]) {
  await finishQuery(queries);
  fireEvent.click(within(card('A')).getByRole('button', { name: '메타데이터 수정' }));
  fireEvent.change(screen.getByLabelText('제목'), {
    target: { value: 'Unsaved title A' },
  });
  fireEvent.change(screen.getByLabelText('이미지 alt'), {
    target: { value: 'Unsaved alt A' },
  });
  fireEvent.change(screen.getByLabelText('플랫폼'), {
    target: { value: 'IOS' },
  });
  fireEvent.change(screen.getByLabelText('화면 유형'), {
    target: { value: 'DETAIL' },
  });
}

function expectDraft() {
  expect(screen.getByLabelText<HTMLInputElement>('제목').value).toBe('Unsaved title A');
  expect(screen.getByLabelText<HTMLInputElement>('이미지 alt').value).toBe('Unsaved alt A');
  expect(screen.getByLabelText<HTMLSelectElement>('플랫폼').value).toBe('IOS');
  expect(screen.getByLabelText<HTMLSelectElement>('화면 유형').value).toBe('DETAIL');
}

it.each([false, true])('preserves draft A while deletion B refreshes, including failure=%s and retry', async fail => {
  const { queries, writes } = mountSection();
  await editA(queries);
  fireEvent.click(within(card('B')).getByRole('button', { name: '스크린샷 삭제' }));
  await waitFor(() => expect(queries).toHaveLength(1));
  expectDraft();
  expect(writes).toEqual([]);
  await finishQuery(queries, fail);
  expectDraft();
  if (fail) {
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    await waitFor(() => expect(queries).toHaveLength(1));
    expectDraft();
    await finishQuery(queries);
  }
  expect(screen.queryByText('Saved alt B', { selector: 'span[title]' })).toBeNull();
  expectDraft();
  fireEvent.click(screen.getByRole('button', { name: /^저장$/ }));
  await waitFor(() =>
    expect(writes).toEqual([
      {
        id: 'A',
        title: 'Unsaved title A',
        imageAlt: 'Unsaved alt A',
        platform: 'IOS',
        screenType: 'DETAIL',
      },
    ])
  );
  await finishQuery(queries);
  await screen.findByText('Unsaved alt A', { selector: 'span[title]' });
  expect(screen.queryByLabelText('제목')).toBeNull();
});

it('closes the deleted screenshot editor and announces deletion even when refresh fails', async () => {
  const { queries, writes } = mountSection();
  await editA(queries);
  fireEvent.click(within(card('A')).getByRole('button', { name: '스크린샷 삭제' }));
  await waitFor(() => expect(queries).toHaveLength(1));
  expect(screen.queryByLabelText('제목')).toBeNull();
  expect(notifications.show).toHaveBeenCalledWith(expect.objectContaining({ message: '스크린샷이 삭제되었습니다.' }));
  await finishQuery(queries, true);
  expect(screen.queryByLabelText('제목')).toBeNull();
  expect(within(card('A')).getByRole('button', { name: '메타데이터 수정' }).getAttribute('aria-expanded')).toBe(
    'false'
  );
  expect(writes).toEqual([]);
});

it('retries an initial lookup failure and shows the loaded screenshots', async () => {
  const { queries } = mountSection();
  await finishQuery(queries, true);
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
  await finishQuery(queries);
  expect(card('A')).toBeTruthy();
  expect(card('B')).toBeTruthy();
});
