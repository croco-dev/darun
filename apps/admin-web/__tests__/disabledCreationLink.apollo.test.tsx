// @vitest-environment jsdom

import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { NewCompanyForm } from '../../../libs/companies/feature/src/NewCompanyForm/NewCompanyForm';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('@darun/utils-router', async importOriginal => ({
  ...(await importOriginal<typeof import('@darun/utils-router')>()),
  useNavigate: () => push,
}));
vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn(), update: vi.fn() },
}));

let client: ApolloClient | undefined;
afterEach(() => {
  cleanup();
  client?.stop();
  vi.clearAllMocks();
});

it('blocks cancellation during a company write and restores the link after failure and success', async () => {
  const requests: { succeed: () => void; fail: () => void }[] = [];
  client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      () =>
        new Observable(observer => {
          requests.push({
            succeed: () => {
              observer.next({
                data: { createCompany: { company: { id: 'saved-company' } } },
              });
              observer.complete();
            },
            fail: () => observer.error(new Error('synthetic write failure')),
          });
        })
    ),
  });
  render(
    <ApolloProvider client={client}>
      <NewCompanyForm />
    </ApolloProvider>
  );
  expect(screen.getByRole('link', { name: '취소' }).getAttribute('href')).toBe('/companies');
  for (const [label, value] of [
    ['회사 이름', '회사 A'],
    ['유형', '법인'],
    ['주소', '서울'],
  ]) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }

  for (const outcome of ['failure', 'success']) {
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(requests).toHaveLength(outcome === 'failure' ? 1 : 2));
    const cancel = screen.getByRole('button', {
      name: '취소',
    }) as HTMLButtonElement;
    expect(cancel.disabled).toBe(true);
    expect(cancel.getAttribute('href')).toBeNull();
    cancel.focus();
    expect(document.activeElement).not.toBe(cancel);
    fireEvent.click(cancel);
    expect(push).not.toHaveBeenCalled();

    await act(async () => {
      if (outcome === 'failure') requests[0]!.fail();
      else requests[1]!.succeed();
    });
    await waitFor(() => expect(screen.getByRole('link', { name: '취소' }).getAttribute('href')).toBe('/companies'));
    if (outcome === 'failure') {
      expect((screen.getByLabelText('회사 이름') as HTMLInputElement).value).toBe('회사 A');
      expect(push).not.toHaveBeenCalled();
    }
  }
  expect(push).toHaveBeenCalledExactlyOnceWith('/companies');
});
