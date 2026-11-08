// @vitest-environment jsdom
import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { GetProductFlowOnEditorDocument, GetProductFlowsOnDetailSectionDocument } from '@darun/provider-graphql';
import { notifications } from '@mantine/notifications';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React, { useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { ProductDetailFlowSection } from '../features/products/ProductDetailFlowSection/ProductDetailFlowSection';
import { ProductFlowEditor } from '../features/products/ProductFlowEditor/ProductFlowEditor';

vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));

const clients: ApolloClient[] = [];
afterEach(() => {
  cleanup();
  clients.splice(0).forEach(client => client.stop());
  vi.clearAllMocks();
});

const screenshots = [1, 2, 3].map(index => ({
  __typename: 'ProductScreenshot',
  id: `shot-${index}`,
  imageUrl: `https://fixture.invalid/${index}.png`,
  imageAlt: `화면 ${index}`,
  title: `화면 ${index}`,
  platform: 'WEB',
}));

function makeFlow(id: string, slug: string) {
  return {
    __typename: 'ProductFlow',
    id,
    product: { __typename: 'Product', id: slug, slug },
    title: `${slug} 기존 플로`,
    description: '기존 설명',
    platform: 'WEB',
    flowType: 'SIGN_UP',
    stepCount: 2,
    coverScreenshot: screenshots[0],
    steps: screenshots.slice(0, 2).map((screenshot, position) => ({
      __typename: 'ProductFlowStep',
      position,
      caption: `기존 안내 ${position + 1}`,
      screenshot,
    })),
  };
}

function setup({ failSavedList = false } = {}) {
  const flows = [makeFlow('flow-alpha', 'alpha'), makeFlow('flow-beta', 'beta')];
  const requests: string[] = [];
  let saved = false;
  let failedList = false;
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      operation =>
        new Observable(observer => {
          const name = operation.operationName ?? '';
          requests.push(name);
          let data;
          if (name === 'GetProductFlowsOnDetailSection') {
            if (saved && failSavedList && !failedList) {
              failedList = true;
              observer.error(new Error('synthetic post-save list failure'));
              return;
            }
            data = { adminProductFlows: flows.filter(flow => flow.product.slug === operation.variables.slug) };
          } else if (name === 'GetProductFlowOnEditor') {
            data = { adminProductFlow: flows.find(flow => flow.id === operation.variables.id) };
          } else if (name === 'GetProductScreenshotsOnFlowEditor') {
            data = {
              tempProductBySlug: { __typename: 'Product', id: operation.variables.slug, screenshots },
            };
          } else {
            const input = operation.variables.input;
            const flow = input.id ? flows.find(item => item.id === input.id)! : makeFlow('flow-created', 'alpha');
            Object.assign(flow, {
              title: input.title,
              description: input.description,
              platform: input.platform,
              flowType: input.flowType,
              stepCount: input.steps.length,
              coverScreenshot: screenshots.find(shot => shot.id === input.steps[0].screenshotId),
              steps: input.steps.map((step: { screenshotId: string; caption: string }, position: number) => ({
                __typename: 'ProductFlowStep',
                position,
                caption: step.caption,
                screenshot: screenshots.find(shot => shot.id === step.screenshotId),
              })),
            });
            if (!input.id) flows.push(flow);
            saved = true;
            data = {
              [input.id ? 'updateProductFlow' : 'createProductFlow']: {
                flow: { __typename: 'ProductFlow', id: flow.id },
              },
            };
          }
          // A transport response is a snapshot, never the mutable backing fixture.
          observer.next({ data: structuredClone(data) });
          observer.complete();
        })
    ),
  });
  clients.push(client);

  function Harness() {
    const [route, setRoute] = useState('list');
    return (
      <ApolloProvider client={client}>
        <div
          onClick={event => {
            const anchor = (event.target as Element).closest('a');
            if (!anchor) return;
            event.preventDefault();
            const path = anchor.getAttribute('href')!;
            setRoute(path.endsWith('/new') ? 'new' : path.split('/').at(-2)!);
          }}
        >
          {route === 'list' ? (
            <ProductDetailFlowSection slug="alpha" />
          ) : (
            <ProductFlowEditor
              key={route}
              slug="alpha"
              flowId={route === 'new' ? undefined : route}
              onSaved={() => setRoute('list')}
              onCancel={() => setRoute('list')}
            />
          )}
        </div>
      </ApolloProvider>
    );
  }
  return { client, requests, Harness };
}

async function addStep(name: string) {
  fireEvent.click(screen.getByRole('button', { name: '단계 추가' }));
  fireEvent.click(await screen.findByRole('button', { name: new RegExp(name) }));
}

it('reads the saved creation once after returning to an unmounted list, then opens its saved draft', async () => {
  const { Harness, requests } = setup();
  render(<Harness />);
  await screen.findByText('alpha 기존 플로');
  fireEvent.click(screen.getByRole('link', { name: '플로 추가' }));
  await screen.findByLabelText('제목');
  await waitFor(() => expect(screen.getByRole('button', { name: '단계 추가' }).matches(':disabled')).toBe(false));
  fireEvent.change(screen.getByLabelText('제목'), { target: { value: '새 가입 흐름' } });
  await addStep('화면 2');
  await addStep('화면 3');
  fireEvent.change(screen.getByLabelText('단계 1 설명'), { target: { value: '저장한 첫 안내' } });
  fireEvent.click(screen.getByRole('button', { name: '플로 등록' }));
  await screen.findByText('새 가입 흐름');
  expect(screen.getAllByText('새 가입 흐름')).toHaveLength(1);
  expect(requests.filter(name => name === 'GetProductFlowsOnDetailSection')).toHaveLength(2);
  expect(requests.filter(name => name === 'CreateProductFlowOnEditor')).toHaveLength(1);
  fireEvent.click(screen.getByRole('link', { name: '새 가입 흐름 플로 수정' }));
  await waitFor(() => expect(screen.getByLabelText<HTMLInputElement>('제목').value).toBe('새 가입 흐름'));
  expect(screen.getByLabelText<HTMLInputElement>('단계 1 설명').value).toBe('저장한 첫 안내');
});

it('refreshes edited title, steps, cover and captions while keeping another product cache intact', async () => {
  const { Harness, client, requests } = setup();
  await client.query({ query: GetProductFlowsOnDetailSectionDocument, variables: { slug: 'beta' } });
  await client.query({ query: GetProductFlowOnEditorDocument, variables: { id: 'flow-beta' } });
  const betaList = client.readQuery({ query: GetProductFlowsOnDetailSectionDocument, variables: { slug: 'beta' } });
  const betaFlow = client.readQuery({ query: GetProductFlowOnEditorDocument, variables: { id: 'flow-beta' } });
  render(<Harness />);
  await screen.findByText('alpha 기존 플로');
  fireEvent.click(screen.getByRole('link', { name: 'alpha 기존 플로 플로 수정' }));
  await screen.findByLabelText('제목');
  fireEvent.change(screen.getByLabelText('제목'), { target: { value: '저장된 새 제목' } });
  fireEvent.click(screen.getByLabelText('단계 2 위로 이동'));
  await addStep('화면 3');
  fireEvent.change(screen.getByLabelText('단계 1 설명'), { target: { value: '바뀐 첫 안내' } });
  fireEvent.click(screen.getByRole('button', { name: '플로 수정' }));
  await screen.findByText('저장된 새 제목');
  expect(screen.getByText('3단계')).toBeTruthy();
  expect(screen.getByRole('img', { name: '화면 2' }).getAttribute('src')).toBe('https://fixture.invalid/2.png');
  fireEvent.click(screen.getByRole('link', { name: '저장된 새 제목 플로 수정' }));
  await waitFor(() => expect(screen.getByLabelText<HTMLInputElement>('제목').value).toBe('저장된 새 제목'));
  expect(screen.getByLabelText<HTMLInputElement>('단계 1 설명').value).toBe('바뀐 첫 안내');
  expect(screen.getByLabelText<HTMLInputElement>('단계 2 설명').value).toBe('기존 안내 1');
  expect(screen.getByLabelText('단계 3 설명')).toBeTruthy();
  expect(requests.filter(name => name === 'GetProductFlowsOnDetailSection')).toHaveLength(3);
  expect(requests.filter(name => name === 'GetProductFlowOnEditor')).toHaveLength(3);
  expect(client.readQuery({ query: GetProductFlowsOnDetailSectionDocument, variables: { slug: 'beta' } })).toEqual(
    betaList
  );
  expect(client.readQuery({ query: GetProductFlowOnEditorDocument, variables: { id: 'flow-beta' } })).toEqual(betaFlow);
});

it('retries only the read when the list fails after a successful creation', async () => {
  const { Harness, requests } = setup({ failSavedList: true });
  render(<Harness />);
  await screen.findByText('alpha 기존 플로');
  fireEvent.click(screen.getByRole('link', { name: '플로 추가' }));
  await screen.findByLabelText('제목');
  await waitFor(() => expect(screen.getByRole('button', { name: '단계 추가' }).matches(':disabled')).toBe(false));
  fireEvent.change(screen.getByLabelText('제목'), { target: { value: '한 번만 만든 플로' } });
  await addStep('화면 1');
  await addStep('화면 2');
  fireEvent.click(screen.getByRole('button', { name: '플로 등록' }));
  fireEvent.click(await screen.findByRole('button', { name: '다시 시도' }));
  await screen.findByText('한 번만 만든 플로');
  expect(requests.filter(name => name === 'CreateProductFlowOnEditor')).toHaveLength(1);
  expect(requests.filter(name => name === 'GetProductFlowsOnDetailSection')).toHaveLength(3);
  expect(notifications.show).not.toHaveBeenCalledWith(expect.objectContaining({ title: '저장 실패' }));
});
