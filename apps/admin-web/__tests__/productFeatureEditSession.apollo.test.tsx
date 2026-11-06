// @vitest-environment jsdom
import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { notifications } from '@mantine/notifications';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { ProductDetailFeatureSection } from '../features/products/ProductDetailFeatureSection/ProductDetailFeatureSection';

vi.mock('@darun/products-feature', async () => ({
  ...(await import('../../../libs/products/feature/src/EditProductFeatureItem/EditProductFeatureItem')),
  ...(await import('../../../libs/products/feature/src/ProductFeatureTable/ProductFeatureTable')),
}));
vi.mock('@darun/utils-router', () => ({
  Link: (props: React.ComponentProps<'a'>) => <a {...props} />,
}));
vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));
vi.mock('@emoji-mart/react', () => ({ default: () => null }));
vi.mock('../features/llm-jobs/TranslationRecovery', () => ({
  TranslationRecovery: () => null,
}));

const clients: ApolloClient[] = [];
afterEach(() => {
  cleanup();
  clients.splice(0).forEach(client => client.stop());
  vi.clearAllMocks();
});

function mountSection() {
  const features = ['A', 'B'].map(id => ({
    __typename: 'Feature',
    id,
    name: `Name ${id}`,
    emoji: '🔎',
    summary: `Summary ${id}`,
  }));
  const pending: ((success: boolean) => void)[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      operation =>
        new Observable(observer => {
          if (operation.operationName === 'TempProductBySlugOnProductFeatureTable') {
            observer.next({
              data: {
                tempProductBySlug: {
                  __typename: 'Product',
                  id: 'product',
                  features: features.map(feature => ({ ...feature })),
                },
              },
            });
            observer.complete();
          } else if (operation.operationName === 'FeatureOnEditProductFeatureItem') {
            observer.next({
              data: {
                feature: {
                  ...features.find(feature => feature.id === operation.variables.id),
                },
              },
            });
            observer.complete();
          } else if (operation.operationName === 'UpdateProductFeatureOnEditProductFeatureItem') {
            pending.push(success => {
              if (!success) return observer.error(new Error('Save A failed'));
              const feature = features.find(feature => feature.id === operation.variables.featureId)!;
              Object.assign(feature, operation.variables.input);
              observer.next({
                data: {
                  updateProductFeature: {
                    feature: { __typename: 'Feature', id: feature.id },
                  },
                },
              });
              observer.complete();
            });
          } else observer.error(new Error(`Unexpected operation: ${operation.operationName}`));
        })
    ),
  });
  clients.push(client);
  render(
    <ApolloProvider client={client}>
      <ProductDetailFeatureSection slug="fixture-app" />
    </ApolloProvider>
  );
  return { client, pending };
}

const nameInput = () => screen.getByLabelText('기능 이름 (name)') as HTMLTextAreaElement;
async function open(id: string) {
  const row = (await screen.findByText(`Name ${id}`, { selector: 'div[title]' })).closest('tr')!;
  fireEvent.click(within(row).getByRole('button', { name: '정보 수정' }));
  await waitFor(() => expect(nameInput().value).toBe(`Name ${id}`));
}
function changeName(value: string) {
  fireEvent.change(nameInput(), { target: { value } });
}
function save() {
  fireEvent.click(screen.getByRole('button', { name: /^저장$/ }));
}
function close(method: string) {
  if (method === 'Escape') fireEvent.keyDown(document, { key: 'Escape' });
  else if (method === 'backdrop') {
    fireEvent.mouseDown(screen.getByRole('dialog'));
    fireEvent.click(screen.getByRole('dialog'));
  } else fireEvent.click(screen.getByRole('button', { name: '닫기' }));
}

it.each(['X', 'Escape', 'backdrop'])(
  'keeps B and its draft open after closing pending A with %s and A succeeds',
  async method => {
    const fixture = mountSection();
    await open('A');
    changeName('Saved A');
    save();
    await waitFor(() => expect(fixture.pending).toHaveLength(1));
    close(method);
    await open('B');
    changeName('Draft B');
    await act(async () => fixture.pending[0](true));
    await waitFor(() => expect(screen.getByText('Saved A', { selector: 'div[title]' })).toBeDefined());
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(nameInput().value).toBe('Draft B');
    expect(nameInput().disabled).toBe(false);
    expect(notifications.show).not.toHaveBeenCalled();
    save();
    await waitFor(() => expect(fixture.pending).toHaveLength(2));
    await act(async () => fixture.pending[1](true));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByText('Draft B', { selector: 'div[title]' })).toBeDefined();
    expect(notifications.show).toHaveBeenCalledExactlyOnceWith({
      message: '수정되었습니다.',
      color: 'teal',
    });
  }
);

it.each(['A', 'B'])('does not notify or close reopened %s when the old A request fails', async id => {
  const fixture = mountSection();
  await open('A');
  save();
  await waitFor(() => expect(fixture.pending).toHaveLength(1));
  close('Escape');
  await open(id);
  changeName(`Draft ${id}`);
  await act(async () => fixture.pending[0](false));
  expect(screen.getByRole('dialog')).toBeDefined();
  expect(nameInput().value).toBe(`Draft ${id}`);
  expect(nameInput().disabled).toBe(false);
  expect(notifications.show).not.toHaveBeenCalled();
});

it('keeps a new session of the same feature open when its old request succeeds', async () => {
  const fixture = mountSection();
  await open('A');
  changeName('Saved A');
  save();
  await waitFor(() => expect(fixture.pending).toHaveLength(1));
  close('X');
  await open('A');
  changeName('New A draft');
  await act(async () => fixture.pending[0](true));
  await waitFor(() => expect(screen.getByText('Saved A', { selector: 'div[title]' })).toBeDefined());
  expect(screen.getByRole('dialog')).toBeDefined();
  expect(nameInput().value).toBe('New A draft');
  expect(notifications.show).not.toHaveBeenCalled();
});
