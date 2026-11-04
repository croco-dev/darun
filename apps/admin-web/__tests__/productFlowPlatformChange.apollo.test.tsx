// @vitest-environment jsdom
import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { ProductFlowEditor } from '../features/products/ProductFlowEditor/ProductFlowEditor';

vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));

const clients: ApolloClient[] = [];
afterEach(() => {
  cleanup();
  clients.splice(0).forEach(client => client.stop());
  vi.restoreAllMocks();
});

const screenshots = [
  ['web-a', '첫 웹 화면', 'WEB'],
  ['web-b', '둘째 웹 화면', 'WEB'],
  ['ios-a', '첫 iOS 화면', 'IOS'],
  ['ios-b', '둘째 iOS 화면', 'IOS'],
].map(([id, title, platform]) => ({
  __typename: 'ProductScreenshot',
  id,
  imageUrl: `https://fixture.invalid/${id}.png`,
  imageAlt: title,
  title,
  platform,
}));

function renderEditor(mode: 'create' | 'update') {
  const writes: Record<string, unknown>[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      operation =>
        new Observable(observer => {
          if (operation.operationName === 'GetProductScreenshotsOnFlowEditor') {
            observer.next({
              data: {
                tempProductBySlug: {
                  __typename: 'Product',
                  id: 'product',
                  screenshots,
                },
              },
            });
          } else if (operation.operationName === 'GetProductFlowOnEditor') {
            observer.next({
              data: {
                adminProductFlow: {
                  __typename: 'ProductFlow',
                  id: 'flow',
                  product: { __typename: 'Product', id: 'product', slug: 'fixture-product' },
                  title: '가입 흐름',
                  description: '입력 보존 확인',
                  platform: 'WEB',
                  flowType: 'SIGN_UP',
                  steps: screenshots.slice(0, 2).map((screenshot, position) => ({
                    __typename: 'ProductFlowStep',
                    position,
                    caption: '',
                    screenshot,
                  })),
                },
              },
            });
          } else {
            writes.push(structuredClone(operation.variables));
            observer.next({
              data: {
                [mode === 'create' ? 'createProductFlow' : 'updateProductFlow']: { flow: { id: 'flow' } },
              },
            });
          }
          observer.complete();
        })
    ),
  });
  clients.push(client);
  render(
    <ApolloProvider client={client}>
      <ProductFlowEditor
        slug="fixture-product"
        flowId={mode === 'update' ? 'flow' : undefined}
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />
    </ApolloProvider>
  );
  return writes;
}

async function addStep(name: string) {
  const add = screen.getByRole('button', { name: '단계 추가' });
  await waitFor(() => expect(add.matches(':disabled')).toBe(false));
  fireEvent.click(add);
  fireEvent.click(screen.getByRole('button', { name: new RegExp(name) }));
}

it.each(['create', 'update'] as const)('preserves the %s draft until platform removal is confirmed', async mode => {
  const writes = renderEditor(mode);
  await screen.findByLabelText('제목');
  if (mode === 'create') {
    fireEvent.change(screen.getByLabelText('제목'), {
      target: { value: '가입 흐름' },
    });
    await addStep('첫 웹 화면');
    await addStep('둘째 웹 화면');
  }
  fireEvent.change(screen.getByLabelText('단계 1 설명'), {
    target: { value: '첫 미저장 안내' },
  });
  fireEvent.change(screen.getByLabelText('단계 2 설명'), {
    target: { value: '둘째 미저장 안내' },
  });
  fireEvent.click(screen.getByLabelText('단계 2 위로 이동'));
  const platform = screen.getByLabelText<HTMLSelectElement>('플랫폼');
  const save = screen.getByRole('button', {
    name: mode === 'create' ? '플로 등록' : '플로 수정',
  });
  const confirm = vi.spyOn(window, 'confirm').mockImplementation(message => {
    expect(message).toContain('2');
    expect(message).toContain('iOS');
    expect(screen.getByLabelText<HTMLInputElement>('단계 1 설명').value).toBe('둘째 미저장 안내');
    expect(screen.getByLabelText<HTMLInputElement>('단계 2 설명').value).toBe('첫 미저장 안내');
    expect(writes).toEqual([]);
    return false;
  });
  fireEvent.change(platform, { target: { value: 'IOS' } });
  expect(confirm).toHaveBeenCalledOnce();
  expect(platform.value).toBe('WEB');
  expect(screen.getByLabelText<HTMLInputElement>('단계 1 설명').value).toBe('둘째 미저장 안내');
  expect(screen.getByLabelText<HTMLInputElement>('단계 2 설명').value).toBe('첫 미저장 안내');
  expect(save.matches(':disabled')).toBe(false);

  confirm.mockReturnValue(true);
  fireEvent.change(platform, { target: { value: 'IOS' } });
  expect(platform.value).toBe('IOS');
  expect(screen.queryByLabelText('단계 1 설명')).toBeNull();
  expect(save.matches(':disabled')).toBe(true);
  expect(writes).toEqual([]);
  await addStep('첫 iOS 화면');
  expect(save.matches(':disabled')).toBe(true);
  await addStep('둘째 iOS 화면');
  fireEvent.click(save);
  await waitFor(() => expect(writes).toHaveLength(1));
  expect(writes[0]).toMatchObject({
    input: {
      platform: 'IOS',
      steps: [
        { screenshotId: 'ios-a', caption: '' },
        { screenshotId: 'ios-b', caption: '' },
      ],
    },
  });
});

it('changes an empty new flow platform without confirmation, including a round trip', async () => {
  const writes = renderEditor('create');
  const platform = await screen.findByLabelText<HTMLSelectElement>('플랫폼');
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  for (const value of ['IOS', 'ANDROID', 'WEB']) {
    fireEvent.change(platform, { target: { value } });
    expect(platform.value).toBe(value);
  }
  expect(confirm).not.toHaveBeenCalled();
  expect(writes).toEqual([]);
});
