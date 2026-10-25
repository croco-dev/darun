// @vitest-environment jsdom
import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { notifications } from '@mantine/notifications';
import { act, cleanup, renderHook } from '@testing-library/react';
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { useWriteMagazine } from '../../../libs/magazines/feature/src/WriteMagazine/useWriteMagazine';

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock('@darun/utils-router', () => ({ useNavigate: () => navigate }));
vi.mock('@darun/utils-image-upload', () => ({
  useImageUpload: () => ({ upload: vi.fn() }),
}));
vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it.each(['returned-draft', 'create'])('opens saved draft %s without claiming publication', async slug => {
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      () =>
        new Observable(observer => {
          observer.next({
            data: {
              createMagazine: {
                magazine: {
                  __typename: 'Magazine',
                  id: 'draft-1',
                  slug,
                },
              },
            },
          });
          observer.complete();
        })
    ),
  });
  const { result } = renderHook(() => useWriteMagazine(), {
    wrapper: ({ children }) => <ApolloProvider client={client}>{children}</ApolloProvider>,
  });
  await act(async () => {
    await result.current.handleSubmit({
      title: '새 글',
      slug: '',
      summary: '',
    });
  });
  expect(navigate).toHaveBeenCalledWith(`/magazines/${slug}/edit`);
  expect(notifications.show).toHaveBeenCalledWith(
    expect.objectContaining({ message: expect.stringContaining('초안') })
  );
  client.stop();
});

it('preserves a failed creation for retry and prevents another write after success', async () => {
  let calls = 0;
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      () =>
        new Observable(observer => {
          calls += 1;
          if (calls === 1) observer.error(new Error('synthetic creation failure'));
          else {
            observer.next({
              data: { createMagazine: { magazine: { __typename: 'Magazine', id: 'new-id', slug: 'saved-slug' } } },
            });
            observer.complete();
          }
        })
    ),
  });
  const { result } = renderHook(() => useWriteMagazine(), {
    wrapper: ({ children }) => <ApolloProvider client={client}>{children}</ApolloProvider>,
  });
  await act(async () => {
    result.current.form.setFieldValue('title', '보존할 초안');
  });
  await act(async () => {
    await result.current.handleSubmit(result.current.form.values);
  });
  expect(navigate).not.toHaveBeenCalled();
  expect(result.current.form.values.title).toBe('보존할 초안');
  expect(notifications.show).toHaveBeenCalledWith(expect.objectContaining({ title: '초안 저장 실패', color: 'red' }));
  await act(async () => {
    await result.current.handleSubmit(result.current.form.values);
  });
  expect(navigate).toHaveBeenCalledWith('/magazines/saved-slug/edit');
  await act(async () => {
    await result.current.handleSubmit(result.current.form.values);
  });
  expect(calls).toBe(2);
  client.stop();
});
