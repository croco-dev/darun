// @vitest-environment jsdom
import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { GetProductScreenshotsOnDetailSectionDocument } from '@darun/provider-graphql';
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
  vi.clearAllMocks();
});

type ReadFailure = boolean | 'graphql';

function mountSection(ids = ['A', 'B'], deferSave = false) {
  const screenshots = ids.map(id => ({
    __typename: 'Screenshot',
    id,
    imageUrl: `https://fixture.invalid/${id}.png`,
    imageAlt: `Saved alt ${id}`,
    title: `Saved title ${id}`,
    platform: 'WEB',
    screenType: 'HOME',
    uiElements: id === 'A' ? ['BUTTON', 'CARD'] : [],
  }));
  const queries: ((fail?: ReadFailure) => void)[] = [];
  const readSlugs: string[] = [];
  const pendingSaves: (() => void)[] = [];
  const writes: Record<string, unknown>[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      operation =>
        new Observable(observer => {
          if (operation.operationName === 'GetProductScreenshotsOnDetailSection') {
            const slug = operation.variables.slug;
            readSlugs.push(slug);
            queries.push(fail => {
              if (fail === 'graphql') {
                observer.next({
                  data: { tempProductBySlug: null },
                  errors: [{ message: 'Internal server error', path: ['tempProductBySlug', 'screenshots'] }],
                });
                observer.complete();
                return;
              }
              if (fail) return observer.error(new Error('Screenshot lookup unavailable'));
              observer.next({
                data: {
                  tempProductBySlug: {
                    __typename: 'Product',
                    id: slug,
                    screenshots: slug === 'fixture-product' ? structuredClone(screenshots) : [],
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
            const completeSave = () => {
              const screenshot = screenshots.find(item => item.id === operation.variables.id)!;
              Object.assign(screenshot, operation.variables);
              const { __typename, id, imageUrl, imageAlt, title, platform, screenType } = screenshot;
              observer.next({
                data: {
                  updateProductScreenshot: {
                    screenshot: { __typename, id, imageUrl, imageAlt, title, platform, screenType },
                  },
                },
              });
              observer.complete();
            };
            if (deferSave) pendingSaves.push(completeSave);
            else completeSave();
          } else observer.error(new Error(`Unexpected operation: ${operation.operationName}`));
        })
    ),
  });
  clients.push(client);
  const section = (slug = 'fixture-product') => (
    <ApolloProvider client={client}>
      <ProductDetailScreenshotSection slug={slug} />
    </ApolloProvider>
  );
  const view = render(section());
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  return { client, pendingSaves, queries, readSlugs, section, view, writes };
}

async function finishQuery(queries: ((fail?: ReadFailure) => void)[], fail: ReadFailure = false) {
  await waitFor(() => expect(queries.length).toBeGreaterThan(0));
  await act(async () => queries.shift()!(fail));
}

function card(id: string) {
  return screen.getByText(`Saved alt ${id}`, { selector: 'span[title]' }).closest('.group') as HTMLElement;
}

async function editA(queries: ((fail?: ReadFailure) => void)[]) {
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

it('shows saved UI elements, writes changes and explicitly clears the saved list', async () => {
  const { queries, writes } = mountSection();
  await finishQuery(queries);
  const openEditor = () => fireEvent.click(within(card('A')).getByRole('button', { name: '메타데이터 수정' }));
  const group = () => screen.getByRole('group', { name: 'UI 요소' });
  const checked = () => within(group()).queryAllByRole('checkbox', { checked: true });
  const save = () => fireEvent.click(screen.getByRole('button', { name: /^저장$/ }));

  expect(within(card('A')).getByText('버튼, 카드')).toBeTruthy();
  openEditor();
  expect(checked().map(item => item.getAttribute('value'))).toEqual(['BUTTON', 'CARD']);
  fireEvent.click(within(group()).getByRole('checkbox', { name: '버튼' }));
  fireEvent.click(within(group()).getByRole('checkbox', { name: '검색 바' }));
  save();
  await finishQuery(queries);
  expect(writes[0]).toMatchObject({ uiElements: ['CARD', 'SEARCH_BAR'] });
  await waitFor(() => expect(screen.queryByRole('group', { name: 'UI 요소' })).toBeNull());

  openEditor();
  expect(checked().map(item => item.getAttribute('value'))).toEqual(['CARD', 'SEARCH_BAR']);
  fireEvent.click(within(group()).getByRole('button', { name: '전체 해제' }));
  save();
  await finishQuery(queries);
  expect(writes[1]).toMatchObject({ uiElements: [] });
  await waitFor(() => expect(screen.queryByRole('group', { name: 'UI 요소' })).toBeNull());

  openEditor();
  expect(checked()).toEqual([]);
});

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

it('closes a saved screenshot edit and retries only the list after a GraphQL read failure', async () => {
  const { queries, writes } = mountSection();
  await editA(queries);
  fireEvent.click(screen.getByRole('button', { name: /^저장$/ }));
  await finishQuery(queries, 'graphql');

  expect(notifications.show).toHaveBeenCalledExactlyOnceWith({
    message: '메타데이터가 저장되었습니다.',
    color: 'teal',
  });
  expect(screen.queryByLabelText('이미지 alt')).toBeNull();
  fireEvent.click(await screen.findByRole('button', { name: '다시 시도' }));
  await finishQuery(queries);
  await screen.findByText('Unsaved alt A', { selector: 'span[title]' });
  expect(writes).toHaveLength(1);
});

it('shows only the lookup error when refreshing a cached empty screenshot list fails', async () => {
  const { client, queries } = mountSection([]);
  const emptyTitle = '등록된 스크린샷이 없습니다.';
  await finishQuery(queries);
  await screen.findByText(emptyTitle);

  await act(async () => {
    void client.refetchQueries({ include: [GetProductScreenshotsOnDetailSectionDocument] }).catch(() => undefined);
  });
  await finishQuery(queries, 'graphql');
  const retry = await screen.findByRole('button', { name: '다시 시도' });
  expect(screen.queryByText(emptyTitle)).toBeNull();
  fireEvent.click(retry);
  await finishQuery(queries);
  await screen.findByText(emptyTitle);
});

it.each(['leaving the route', 'switching products'])(
  'refreshes the saved product metadata after %s',
  async navigation => {
    const { pendingSaves, queries, readSlugs, section, view, writes } = mountSection(undefined, true);
    await finishQuery(queries);
    fireEvent.click(within(card('A')).getByRole('button', { name: '메타데이터 수정' }));
    fireEvent.click(screen.getByRole('checkbox', { name: '검색 바' }));
    fireEvent.click(screen.getByRole('button', { name: /^저장$/ }));
    await waitFor(() => expect(pendingSaves).toHaveLength(1));

    if (navigation === 'switching products') {
      view.rerender(section('other-product'));
      await finishQuery(queries);
    }
    await act(async () => pendingSaves[0]());
    await waitFor(() => expect(queries).toHaveLength(1));
    expect(readSlugs.at(-1)).toBe('fixture-product');
    if (navigation === 'leaving the route') view.unmount();
    await finishQuery(queries);

    if (navigation === 'leaving the route') render(section());
    else view.rerender(section());
    await screen.findByText('버튼, 카드, 검색 바');
    expect(writes).toHaveLength(1);
  }
);
