import { ApolloClient, ApolloLink, InMemoryCache, Observable, type Operation } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EditProductCompany } from '../EditProductCompany';

vi.mock('@darun/utils-router', () => ({ useNavigate: () => vi.fn() }));
vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));

const clients: ApolloClient[] = [];
afterEach(() => {
  cleanup();
  clients.forEach(client => client.stop());
  clients.length = 0;
});

const company = (id: string) => ({
  id,
  name: `회사 ${id}`,
  type: null,
  address: null,
  startAt: null,
});
const product = (id: string, companyId: string | null) => ({
  id,
  ownedCompany: companyId ? company(companyId) : null,
});

function setup() {
  const reads: Array<{
    resolve: (value: ReturnType<typeof product> | null) => void;
    reject: () => void;
  }> = [];
  const writes: Operation[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      operation =>
        new Observable(observer => {
          if (operation.operationName === 'TempProductBySlugOnProductCompanyInfo') {
            reads.push({
              resolve: value => {
                observer.next({ data: { tempProductBySlug: value } });
                observer.complete();
              },
              reject: () => observer.error(new Error('fixture read failed')),
            });
          } else if (operation.operationName === 'SearchCompaniesOnEditProductCompany') {
            observer.next({ data: { searchCompanies: [company('b')] } });
            observer.complete();
          } else {
            writes.push(operation);
            observer.next({
              data: {
                registerProductCompany: { product: { id: 'product-a' } },
              },
            });
            observer.complete();
          }
        })
    ),
  });
  clients.push(client);
  const renderForm = (slug: string) => (
    <ApolloProvider client={client}>
      <EditProductCompany slug={slug} />
    </ApolloProvider>
  );
  const view = render(renderForm('fixture-a'));
  return {
    reads,
    writes,
    client,
    submit: () => fireEvent.submit(view.container.querySelector('form')!),
    save: () => screen.getByRole<HTMLButtonElement>('button', { name: '저장' }),
    select: () => screen.getByRole<HTMLSelectElement>('combobox'),
    changeSlug: (slug: string) => view.rerender(renderForm(slug)),
  };
}

async function chooseB() {
  fireEvent.change(screen.getByPlaceholderText('회사 이름을 검색하세요'), {
    target: { value: '회사' },
  });
  await screen.findByRole('option', { name: '회사 b' });
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'b' } });
}

describe('회사 연결 초기 조회와 초안', () => {
  it('초기 조회 중 편집과 강제 제출을 막고 실패 후 같은 폼에서 복구한다', async () => {
    const fixture = setup();
    expect(fixture.save().disabled).toBe(true);
    expect(fixture.select().disabled).toBe(true);
    expect(screen.getByPlaceholderText<HTMLInputElement>('회사 이름을 검색하세요').disabled).toBe(true);
    fixture.submit();
    expect(fixture.writes).toHaveLength(0);
    await act(async () => fixture.reads.shift()!.reject());
    expect(fixture.save().disabled).toBe(true);
    fixture.submit();
    expect(fixture.writes).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    await waitFor(() => expect(fixture.reads).toHaveLength(1));
    await act(async () => fixture.reads.shift()!.resolve(product('product-a', 'a')));
    await waitFor(() => expect(fixture.select().value).toBe('a'));
    expect(fixture.save().disabled).toBe(false);
  });

  it('선택한 B는 캐시 변경과 재조회 실패·복구 뒤에도 유지하고 같은 ID를 저장한다', async () => {
    const fixture = setup();
    await act(async () => fixture.reads.shift()!.resolve(product('product-a', 'a')));
    await chooseB();
    await act(async () => {
      fixture.client.cache.modify({
        id: 'ROOT_QUERY',
        fields: { tempProductBySlug: () => product('product-a', 'c') },
      });
    });
    await screen.findByRole('option', { name: '회사 c (현재 연결됨)' });
    expect(fixture.select().value).toBe('b');
    let refresh: Promise<unknown>;
    await act(async () => {
      refresh = fixture.client.refetchQueries({ include: 'active' }).catch(() => {});
    });
    fixture.submit();
    expect(fixture.writes).toHaveLength(0);
    await act(async () => {
      fixture.reads.shift()!.reject();
      await refresh!;
    });
    expect(fixture.select().value).toBe('b');
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    await waitFor(() => expect(fixture.reads).toHaveLength(1));
    await act(async () => fixture.reads.shift()!.resolve(product('product-a', 'a')));
    expect(fixture.select().value).toBe('b');
    fixture.submit();
    await waitFor(() => expect(fixture.writes).toHaveLength(1));
    expect(fixture.writes[0]?.variables).toEqual({
      slug: 'fixture-a',
      input: { companyId: 'b' },
    });
    await act(async () => fixture.reads.shift()!.resolve(product('product-a', 'b')));
  });

  it('연결 회사가 없는 정상 상품에서도 새 선택을 저장한다', async () => {
    const fixture = setup();
    await act(async () => fixture.reads.shift()!.resolve(product('product-a', null)));
    expect(fixture.select().value).toBe('');
    expect(fixture.save().disabled).toBe(false);
    await chooseB();
    fixture.submit();
    await waitFor(() => expect(fixture.writes).toHaveLength(1));
    expect(fixture.writes[0]?.variables.input).toEqual({ companyId: 'b' });
    await act(async () => fixture.reads.shift()!.resolve(product('product-a', 'b')));
  });

  it('상품 부재는 빈 회사와 구분하고 저장하지 않는다', async () => {
    const fixture = setup();
    await act(async () => fixture.reads.shift()!.resolve(null));
    expect(screen.getByText('상품을 찾을 수 없습니다.')).toBeTruthy();
    expect(fixture.save().disabled).toBe(true);
    fixture.submit();
    expect(fixture.writes).toHaveLength(0);
  });

  it('상품 전환 뒤 이전 초안을 새 상품에 저장하지 않는다', async () => {
    const fixture = setup();
    await act(async () => fixture.reads.shift()!.resolve(product('product-a', 'a')));
    await chooseB();
    fixture.changeSlug('fixture-next');
    expect(fixture.save().disabled).toBe(true);
    fixture.submit();
    expect(fixture.writes).toHaveLength(0);
    await waitFor(() => expect(fixture.reads).toHaveLength(1));
    await act(async () => fixture.reads.shift()!.resolve(product('product-next', null)));
    expect(fixture.select().value).toBe('');
    fixture.submit();
    expect(fixture.writes).toHaveLength(0);
  });
});
