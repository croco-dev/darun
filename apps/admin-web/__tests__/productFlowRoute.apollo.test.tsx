// @vitest-environment jsdom
import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { EditProductFlowPanel } from '../features/products/ProductFlowEditor/EditProductFlowPanel';

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock('@darun/utils-router', () => ({ useNavigate: () => navigate }));
vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));

const clients: ApolloClient[] = [];
afterEach(() => {
  cleanup();
  clients.splice(0).forEach(client => client.stop());
  vi.clearAllMocks();
});

function flow(productSlug: string, id = 'flow-b') {
  const screenshots = [1, 2].map(index => ({
    __typename: 'Screenshot',
    id: `${productSlug}-shot-${index}`,
    imageUrl: `https://fixture.invalid/${index}.png`,
    imageAlt: `${productSlug} 화면 ${index}`,
    title: null,
    platform: 'WEB',
  }));
  return {
    __typename: 'VisualFlow',
    id,
    title: `${productSlug} 가입 흐름`,
    description: '저장된 설명',
    platform: 'WEB',
    flowType: 'SIGN_UP',
    product: {
      __typename: 'Product',
      id: `product-${productSlug}`,
      slug: productSlug,
    },
    steps: screenshots.map((screenshot, position) => ({
      position,
      caption: '',
      screenshot,
    })),
  };
}

function setup({ missing = false, failOnce = false } = {}) {
  const requests: Array<{ name: string; variables: Record<string, unknown> }> = [];
  let failed = false;
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      operation =>
        new Observable(observer => {
          requests.push({
            name: operation.operationName ?? '',
            variables: structuredClone(operation.variables),
          });
          if (operation.operationName === 'GetProductFlowOnEditor') {
            if (failOnce && !failed) {
              failed = true;
              observer.error(new Error('synthetic flow read failure'));
              return;
            }
            observer.next({
              data: {
                adminProductFlow: missing
                  ? null
                  : flow(operation.variables.id === 'flow-a' ? 'alpha' : 'beta', operation.variables.id),
              },
            });
          } else if (operation.operationName === 'GetProductScreenshotsOnFlowEditor') {
            const productFlow = flow(operation.variables.slug);
            observer.next({
              data: {
                tempProductBySlug: {
                  ...productFlow.product,
                  screenshots: productFlow.steps.map(step => step.screenshot),
                },
              },
            });
          } else {
            observer.next({
              data: {
                updateProductFlow: {
                  flow: { id: operation.variables.input.id },
                },
              },
            });
          }
          observer.complete();
        })
    ),
  });
  clients.push(client);
  const panel = (slug: string, flowId = 'flow-b') => (
    <ApolloProvider client={client}>
      <EditProductFlowPanel slug={slug} flowId={flowId} />
    </ApolloProvider>
  );
  return { panel, requests };
}

it('blocks an alpha URL with a beta flow and links to the actual product edit URL', async () => {
  const { panel, requests } = setup();
  render(panel('alpha'));
  const link = await screen.findByRole('link', {
    name: '소속 상품에서 플로 수정',
  });
  expect(link.getAttribute('href')).toBe('/products/beta/flows/flow-b/edit');
  expect(screen.queryByLabelText('제목')).toBeNull();
  expect(screen.queryByRole('button', { name: '플로 수정' })).toBeNull();
  expect(requests.filter(request => request.name === 'UpdateProductFlowOnEditor')).toEqual([]);
});

it('uses the canonical product for screenshots, saving and returning, including a route change', async () => {
  const { panel, requests } = setup();
  const view = render(panel('alpha', 'flow-a'));
  await waitFor(() => expect(screen.getByLabelText<HTMLInputElement>('제목').value).toBe('alpha 가입 흐름'));
  fireEvent.change(screen.getByLabelText('제목'), {
    target: { value: '다른 상품의 초안' },
  });
  view.rerender(panel('beta'));
  await waitFor(() => expect(screen.getByLabelText<HTMLInputElement>('제목').value).toBe('beta 가입 흐름'));
  fireEvent.change(screen.getByLabelText('제목'), {
    target: { value: '수정한 beta 플로' },
  });
  fireEvent.click(screen.getByRole('button', { name: '플로 수정' }));
  await waitFor(() => expect(navigate).toHaveBeenCalledExactlyOnceWith('/products/beta'));
  expect(requests.filter(request => request.name === 'UpdateProductFlowOnEditor')).toEqual([
    {
      name: 'UpdateProductFlowOnEditor',
      variables: {
        input: {
          id: 'flow-b',
          title: '수정한 beta 플로',
          description: '저장된 설명',
          platform: 'WEB',
          flowType: 'SIGN_UP',
          steps: [
            { screenshotId: 'beta-shot-1', caption: '' },
            { screenshotId: 'beta-shot-2', caption: '' },
          ],
        },
      },
    },
  ]);
  expect(requests).toContainEqual({
    name: 'GetProductScreenshotsOnFlowEditor',
    variables: { slug: 'beta' },
  });
  fireEvent.click(screen.getByRole('button', { name: '취소' }));
  expect(navigate).toHaveBeenLastCalledWith('/products/beta');
});

it('shows a missing flow separately from a query failure and exposes no editable form', async () => {
  const { panel, requests } = setup({ missing: true });
  render(panel('beta'));
  await screen.findByText('플로를 찾을 수 없습니다.');
  expect(screen.queryByLabelText('제목')).toBeNull();
  expect(screen.queryByRole('button', { name: '다시 시도' })).toBeNull();
  expect(requests.filter(request => request.name === 'UpdateProductFlowOnEditor')).toEqual([]);
});

it('retries a failed query without saving, then permits editing only in the matching product', async () => {
  const { panel, requests } = setup({ failOnce: true });
  render(panel('beta'));
  await screen.findByText('플로를 불러오지 못했습니다.');
  expect(screen.queryByLabelText('제목')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
  await waitFor(() => expect(screen.getByLabelText<HTMLInputElement>('제목').value).toBe('beta 가입 흐름'));
  expect(requests.filter(request => request.name === 'GetProductFlowOnEditor')).toHaveLength(2);
  expect(requests.filter(request => request.name === 'UpdateProductFlowOnEditor')).toEqual([]);
});
