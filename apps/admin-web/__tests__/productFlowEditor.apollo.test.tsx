// @vitest-environment jsdom
import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { notifications } from '@mantine/notifications';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { ProductFlowEditor } from '../features/products/ProductFlowEditor/ProductFlowEditor';

vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));

const clients: ApolloClient[] = [];
afterEach(() => {
  cleanup();
  clients.splice(0).forEach(client => client.stop());
  vi.clearAllMocks();
});

const screenshots = ['첫 화면', '둘째 화면', '추가 화면'].map((title, index) => ({
  __typename: 'ProductScreenshot',
  id: `shot-${index + 1}`,
  imageUrl: `https://fixture.invalid/shot-${index + 1}.png`,
  imageAlt: title,
  title,
  platform: 'WEB',
}));

function renderScreenshotRecovery(mode: 'create' | 'update') {
  const reads: Array<{
    succeed: (shots: typeof screenshots) => void;
    fail: () => void;
  }> = [];
  const writes: Record<string, unknown>[] = [];
  const onSaved = vi.fn();
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      operation =>
        new Observable(observer => {
          if (operation.operationName === 'GetProductScreenshotsOnFlowEditor') {
            reads.push({
              succeed: shots => {
                observer.next({
                  data: {
                    tempProductBySlug: {
                      __typename: 'Product',
                      id: 'product',
                      screenshots: shots,
                    },
                  },
                });
                observer.complete();
              },
              fail: () => observer.error(new Error('synthetic screenshot read failure')),
            });
          } else if (operation.operationName === 'GetProductFlowOnEditor') {
            observer.next({
              data: {
                adminProductFlow: {
                  __typename: 'ProductFlow',
                  id: 'flow',
                  product: {
                    __typename: 'Product',
                    id: 'product',
                    slug: 'fixture-product',
                  },
                  title: '기존 제목',
                  description: '기존 설명',
                  platform: 'WEB',
                  flowType: 'ONBOARDING',
                  steps: screenshots.slice(0, 2).map((screenshot, position) => ({
                    __typename: 'ProductFlowStep',
                    position,
                    caption: `원래 설명 ${position + 1}`,
                    screenshot,
                  })),
                },
              },
            });
            observer.complete();
          } else {
            writes.push(structuredClone(operation.variables));
            observer.next({
              data: {
                [mode === 'create' ? 'createProductFlow' : 'updateProductFlow']: {
                  flow: { __typename: 'ProductFlow', id: 'flow' },
                },
              },
            });
            observer.complete();
          }
        })
    ),
  });
  clients.push(client);
  render(
    <ApolloProvider client={client}>
      <ProductFlowEditor
        slug="fixture-product"
        flowId={mode === 'update' ? 'flow' : undefined}
        onSaved={onSaved}
        onCancel={vi.fn()}
      />
    </ApolloProvider>
  );
  return { reads, writes, onSaved };
}

it.each(['create', 'update'] as const)('recovers the %s screenshot read without resetting the draft', async mode => {
  const { reads, writes, onSaved } = renderScreenshotRecovery(mode);
  await screen.findByLabelText('제목');
  await screen.findByText('스크린샷을 불러오는 중입니다.');
  expect(screen.queryByText('이 플랫폼에 등록된 스크린샷이 없습니다.')).toBeNull();
  fireEvent.change(screen.getByLabelText('제목'), {
    target: { value: '보존할 제목' },
  });
  fireEvent.change(screen.getByLabelText('설명'), {
    target: { value: '보존할 설명' },
  });
  if (mode === 'update') {
    await screen.findByLabelText('단계 1 설명');
    expect(screen.getByRole('img', { name: '첫 화면' }).getAttribute('src')).toBe(screenshots[0].imageUrl);
    fireEvent.change(screen.getByLabelText('단계 1 설명'), {
      target: { value: '편집한 첫 안내' },
    });
    fireEvent.click(screen.getByLabelText('단계 2 위로 이동'));
  }
  await act(async () => reads[0].fail());
  await screen.findByText('스크린샷을 불러오지 못했습니다.');
  expect(screen.getByRole('button', { name: '단계 추가' }).matches(':disabled')).toBe(true);
  expect(screen.queryByText('이 플랫폼에 등록된 스크린샷이 없습니다.')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '스크린샷 다시 불러오기' }));
  await waitFor(() => expect(reads).toHaveLength(2));
  await screen.findByText('스크린샷을 불러오는 중입니다.');
  expect(screen.getByLabelText<HTMLInputElement>('제목').value).toBe('보존할 제목');
  expect(screen.getByLabelText<HTMLTextAreaElement>('설명').value).toBe('보존할 설명');
  if (mode === 'update') {
    expect(screen.getByLabelText<HTMLInputElement>('단계 1 설명').value).toBe('원래 설명 2');
    expect(screen.getByLabelText<HTMLInputElement>('단계 2 설명').value).toBe('편집한 첫 안내');
    expect(screen.getByRole('img', { name: '첫 화면' })).toBeTruthy();
  }
  // A second failure must remain retryable, without an unhandled refetch rejection.
  await act(async () => reads[1].fail());
  fireEvent.click(await screen.findByRole('button', { name: '스크린샷 다시 불러오기' }));
  await waitFor(() => expect(reads).toHaveLength(3));
  await act(async () => reads[2].succeed(screenshots));
  await waitFor(() => expect(screen.getByRole('button', { name: '단계 추가' }).matches(':disabled')).toBe(false));
  expect(screen.queryByText('스크린샷을 불러오지 못했습니다.')).toBeNull();
  for (const name of mode === 'create' ? ['첫 화면', '둘째 화면'] : ['추가 화면']) {
    fireEvent.click(screen.getByRole('button', { name: '단계 추가' }));
    fireEvent.click(screen.getByRole('button', { name: new RegExp(name) }));
  }
  fireEvent.click(
    screen.getByRole('button', {
      name: mode === 'create' ? '플로 등록' : '플로 수정',
    })
  );
  await waitFor(() => expect(onSaved).toHaveBeenCalledExactlyOnceWith('flow'));
  expect(writes).toEqual([
    {
      input: {
        ...(mode === 'create' ? { productSlug: 'fixture-product' } : { id: 'flow' }),
        title: '보존할 제목',
        description: '보존할 설명',
        platform: 'WEB',
        flowType: 'ONBOARDING',
        steps:
          mode === 'create'
            ? [
                { screenshotId: 'shot-1', caption: '' },
                { screenshotId: 'shot-2', caption: '' },
              ]
            : [
                { screenshotId: 'shot-2', caption: '원래 설명 2' },
                { screenshotId: 'shot-1', caption: '편집한 첫 안내' },
                { screenshotId: 'shot-3', caption: '' },
              ],
      },
    },
  ]);
});

it.each(['create', 'update'] as const)('distinguishes a successful empty screenshot list in %s', async mode => {
  const { reads } = renderScreenshotRecovery(mode);
  await screen.findByLabelText('제목');
  await waitFor(() => expect(reads).toHaveLength(1));
  await act(async () => reads[0].succeed([]));
  await screen.findByText('이 플랫폼에 등록된 스크린샷이 없습니다.');
  expect(screen.queryByText('스크린샷을 불러오지 못했습니다.')).toBeNull();
  expect(screen.getByRole('button', { name: '단계 추가' }).matches(':disabled')).toBe(true);
  if (mode === 'update') expect(screen.getByRole('img', { name: '첫 화면' })).toBeTruthy();
});

it.each([
  ['create', 'success'],
  ['create', 'failure'],
  ['update', 'success'],
  ['update', 'failure'],
] as const)('locks the %s draft during a delayed %s and preserves it for retry', async (mode, outcome) => {
  const writes: Record<string, unknown>[] = [];
  const completions: Array<(succeed: boolean) => void> = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      operation =>
        new Observable(observer => {
          if (operation.operationName === 'GetProductScreenshotsOnFlowEditor') {
            observer.next({ data: { tempProductBySlug: { __typename: 'Product', id: 'product', screenshots } } });
            observer.complete();
          } else if (operation.operationName === 'GetProductFlowOnEditor') {
            observer.next({
              data: {
                adminProductFlow: {
                  __typename: 'ProductFlow',
                  id: 'flow',
                  product: { __typename: 'Product', id: 'product', slug: 'fixture-product' },
                  title: '기존 제목',
                  description: '기존 설명',
                  platform: 'WEB',
                  flowType: 'ONBOARDING',
                  steps: screenshots.slice(0, 2).map((screenshot, position) => ({
                    __typename: 'ProductFlowStep',
                    position,
                    caption: '',
                    screenshot,
                  })),
                },
              },
            });
            observer.complete();
          } else {
            writes.push(structuredClone(operation.variables));
            completions.push(succeed => {
              if (succeed) {
                observer.next({
                  data: {
                    [mode === 'create' ? 'createProductFlow' : 'updateProductFlow']: {
                      flow: { __typename: 'ProductFlow', id: 'flow' },
                    },
                  },
                });
                observer.complete();
              } else observer.error(new Error('synthetic save failure'));
            });
          }
        })
    ),
  });
  clients.push(client);
  const onSaved = vi.fn();
  const onCancel = vi.fn();
  const view = render(
    <ApolloProvider client={client}>
      <ProductFlowEditor
        slug="fixture-product"
        flowId={mode === 'update' ? 'flow' : undefined}
        onSaved={onSaved}
        onCancel={onCancel}
      />
    </ApolloProvider>
  );
  await screen.findByLabelText('제목');
  const addStepButton = screen.getByRole('button', { name: '단계 추가' });
  if (mode === 'create') {
    await waitFor(() => expect(addStepButton.matches(':disabled')).toBe(false));
    for (const name of ['첫 화면', '둘째 화면']) {
      fireEvent.click(addStepButton);
      fireEvent.click(screen.getByRole('button', { name: new RegExp(name) }));
    }
  }
  fireEvent.change(screen.getByLabelText('제목'), { target: { value: '저장할 제목' } });
  fireEvent.change(screen.getByLabelText('설명'), { target: { value: '저장할 설명' } });
  fireEvent.change(screen.getByLabelText('단계 1 설명'), { target: { value: '첫 안내' } });
  fireEvent.change(screen.getByLabelText('단계 2 설명'), { target: { value: '둘째 안내' } });
  fireEvent.click(screen.getByLabelText('단계 2 위로 이동'));
  fireEvent.click(addStepButton);
  const save = screen.getByRole('button', { name: mode === 'create' ? '플로 등록' : '플로 수정' });
  fireEvent.click(save);
  await waitFor(() => expect(writes).toHaveLength(1));

  // Native fieldset semantics must disable every editable control, including an already-open picker.
  for (const control of view.container.querySelectorAll('input, textarea, select, button')) {
    expect(control.matches(':disabled'), control.outerHTML).toBe(true);
  }
  expect(onSaved).not.toHaveBeenCalled();
  expect(onCancel).not.toHaveBeenCalled();
  fireEvent.click(save);
  // Synthetic events also exercise the step handlers' pending guards.
  for (const name of ['단계 1 아래로 이동', '단계 2 위로 이동', '단계 1 제거', '단계 2 제거']) {
    fireEvent.click(screen.getByLabelText(name));
  }
  fireEvent.click(screen.getByRole('button', { name: /추가 화면/ }));
  expect(screen.getByLabelText<HTMLInputElement>('단계 1 설명').value).toBe('둘째 안내');
  expect(screen.getByLabelText<HTMLInputElement>('단계 2 설명').value).toBe('첫 안내');
  expect(writes).toEqual([
    {
      input: {
        ...(mode === 'create' ? { productSlug: 'fixture-product' } : { id: 'flow' }),
        title: '저장할 제목',
        description: '저장할 설명',
        platform: 'WEB',
        flowType: 'ONBOARDING',
        steps: [
          { screenshotId: 'shot-2', caption: '둘째 안내' },
          { screenshotId: 'shot-1', caption: '첫 안내' },
        ],
      },
    },
  ]);
  await act(async () => completions[0](outcome === 'success'));
  if (outcome === 'failure') {
    expect(onSaved).not.toHaveBeenCalled();
    expect(notifications.show).toHaveBeenCalledWith(expect.objectContaining({ title: '저장 실패', color: 'red' }));
    expect(screen.getByLabelText<HTMLInputElement>('제목').value).toBe('저장할 제목');
    expect(screen.getByLabelText<HTMLTextAreaElement>('설명').value).toBe('저장할 설명');
    expect(screen.getByLabelText<HTMLInputElement>('단계 1 설명').value).toBe('둘째 안내');
    expect(screen.getByLabelText<HTMLInputElement>('단계 2 설명').value).toBe('첫 안내');
    expect(save.matches(':disabled')).toBe(false);
    fireEvent.change(screen.getByLabelText('제목'), { target: { value: '재시도 제목' } });
    fireEvent.click(save);
    await waitFor(() => expect(writes).toHaveLength(2));
    expect(writes[1]).toEqual({ input: { ...(writes[0].input as object), title: '재시도 제목' } });
    await act(async () => completions[1](true));
  }
  expect(onSaved).toHaveBeenCalledExactlyOnceWith('flow');
});
