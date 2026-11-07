// @vitest-environment jsdom
import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { act, cleanup, renderHook } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useNewCompanyForm } from '../NewCompanyForm/useNewCompanyForm';

vi.mock('@darun/ui-admin', () => ({ notifySavedWithRefresh: vi.fn() }));
vi.mock('@darun/utils-router', () => ({ useNavigate: () => vi.fn() }));
vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));

const clients: ApolloClient[] = [];
afterEach(() => {
  cleanup();
  clients.splice(0).forEach(client => client.stop());
  vi.clearAllMocks();
});

function fixture() {
  const writes: Record<string, unknown>[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      operation =>
        new Observable(observer => {
          writes.push(operation.variables);
          observer.next({ data: { createCompany: { company: { id: 'company-1' } } } });
          observer.complete();
        })
    ),
  });
  clients.push(client);
  return {
    writes,
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <ApolloProvider client={client}>{children}</ApolloProvider>
    ),
  };
}

it('공백뿐인 필수 입력은 기존 필드 오류로 안내하고 제출하지 않는다', () => {
  const f = fixture();
  const { result } = renderHook(() => useNewCompanyForm(), { wrapper: f.wrapper });
  act(() => result.current.form.setValues({ name: '  ', type: '\t', address: '\n' }));
  act(() => result.current.form.onSubmit(result.current.handleSubmit)());
  expect(result.current.form.errors).toMatchObject({
    name: expect.any(String),
    type: expect.any(String),
    address: expect.any(String),
  });
  expect(f.writes).toEqual([]);
});

describe.each([
  ['name', 100],
  ['type', 20],
  ['address', 200],
] as const)('%s 제출 전 길이 검증', (field, limit) => {
  it.each(['한', '🚀'])('%s 초과 입력을 보존하고 같은 폼에서 상한으로 고친 뒤 제출한다', async character => {
    const f = fixture();
    const { result } = renderHook(() => useNewCompanyForm(), { wrapper: f.wrapper });
    const values = {
      name: ' 다런 ',
      type: ' 법인 ',
      address: ' 서울 ',
      startAt: '2026-10-01',
      startAtIsDisabled: true,
      [field]: character.repeat(limit + 1),
    };
    act(() => result.current.form.setValues(values));
    act(() => result.current.form.onSubmit(result.current.handleSubmit)());
    expect(result.current.form.errors[field]).toBeTruthy();
    expect(result.current.form.getValues()).toMatchObject(values);
    expect(f.writes).toEqual([]);

    // 직접 submit 경로도 mutation 전에 같은 검사를 해야 한다.
    act(() => result.current.handleSubmit(values));
    expect(f.writes).toEqual([]);
    const fixed = { ...values, [field]: ` ${character.repeat(limit)} ` };
    act(() => result.current.form.setValues(fixed));
    await act(async () => result.current.form.onSubmit(result.current.handleSubmit)());
    expect(f.writes).toHaveLength(1);
    expect(f.writes[0].input).toMatchObject({
      name: fixed.name.trim(),
      type: fixed.type.trim(),
      address: fixed.address.trim(),
      startAt: undefined,
    });
  });
});
