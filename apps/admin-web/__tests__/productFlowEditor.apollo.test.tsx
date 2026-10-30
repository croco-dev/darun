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
