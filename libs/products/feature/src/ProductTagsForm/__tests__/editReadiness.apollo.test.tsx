import { ApolloClient, ApolloLink, InMemoryCache, Observable, type Operation } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EditAlternativeProducts } from '../../EditAlternativeProducts/EditAlternativeProducts';
import { ProductTagsForm } from '../ProductTagsForm';

vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));

const clients: ApolloClient[] = [];
afterEach(() => {
  cleanup();
  clients.forEach(client => client.stop());
  clients.length = 0;
});

function setup(kind: 'tags' | 'alternatives') {
  const reads: Array<{
    resolve: (product: Record<string, unknown> | null) => void;
    reject: () => void;
  }> = [];
  const writes: Operation[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      operation =>
        new Observable(observer => {
          if (operation.operationName?.startsWith('TempProduct')) {
            reads.push({
              resolve: product => {
                observer.next({ data: { tempProductBySlug: product } });
                observer.complete();
              },
              reject: () => observer.error(new Error('fixture read failed')),
            });
          } else {
            writes.push(operation);
            observer.next({
              data:
                kind === 'tags'
                  ? {
                      updateProductTags: {
                        product: { id: 'product-a', tags: [] },
                      },
                    }
                  : {
                      updateAlternativeProduct: {
                        product: { id: 'product-a', alternatives: [] },
                      },
                    },
            });
            observer.complete();
          }
        })
    ),
  });
  clients.push(client);
  const view = render(
    <ApolloProvider client={client}>
      {kind === 'tags' ? <ProductTagsForm slug="fixture-a" /> : <EditAlternativeProducts slug="fixture-a" />}
    </ApolloProvider>
  );
  const submit = () => fireEvent.submit(view.container.querySelector('form')!);
  const save = () => screen.getByRole<HTMLButtonElement>('button', { name: '저장' });
  const product = {
    id: 'product-a',
    tags: [{ id: 'tag-a', name: '핀테크' }],
    alternatives: [{ id: 'alt-b', name: '다른 서비스 B' }],
  };
  return { reads, writes, submit, save, product, client };
}

describe.each(['tags', 'alternatives'] as const)('%s 편집 초기 조회', kind => {
  it('지연·실패한 조회에서 강제로 submit해도 저장하지 않고 재조회한 기존 값으로 편집한다', async () => {
    const fixture = setup(kind);
    fixture.submit();
    expect(fixture.writes).toHaveLength(0);
    expect(fixture.save().disabled).toBe(true);
    await act(async () => fixture.reads.shift()!.reject());
    fixture.submit();
    expect(fixture.writes).toHaveLength(0);
    expect(fixture.save().disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    await waitFor(() => expect(fixture.reads).toHaveLength(1));
    await act(async () => fixture.reads.shift()!.resolve(fixture.product));
    await waitFor(() => expect(fixture.save().disabled).toBe(false));
    if (kind === 'tags') {
      expect(screen.getByRole<HTMLInputElement>('textbox').value).toBe('핀테크');
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: '' },
      });
    } else {
      const select = screen.getByRole<HTMLSelectElement>('listbox');
      expect([...select.selectedOptions].map(option => option.value)).toEqual(['alt-b']);
      for (const option of select.options) option.selected = false;
      fireEvent.change(select);
    }
    fixture.submit();
    await waitFor(() => expect(fixture.writes).toHaveLength(1));
    expect(fixture.writes[0]?.variables).toEqual({
      slug: 'fixture-a',
      input: kind === 'tags' ? { tagNames: [] } : { alternativeProductIds: [] },
    });
    await act(async () => fixture.reads.shift()!.resolve({ ...fixture.product, tags: [], alternatives: [] }));
  });

  it('기존 값이 있어도 재조회 중이거나 실패하면 저장을 차단하고 복구 후 기존 값을 저장한다', async () => {
    const fixture = setup(kind);
    await act(async () => fixture.reads.shift()!.resolve(fixture.product));
    await waitFor(() => expect(fixture.save().disabled).toBe(false));
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
    fixture.submit();
    expect(fixture.writes).toHaveLength(0);
    expect(fixture.save().disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    await waitFor(() => expect(fixture.reads).toHaveLength(1));
    await act(async () => fixture.reads.shift()!.resolve(fixture.product));
    await waitFor(() => expect(fixture.save().disabled).toBe(false));
    fixture.submit();
    await waitFor(() => expect(fixture.writes).toHaveLength(1));
    expect(fixture.writes[0]?.variables).toEqual({
      slug: 'fixture-a',
      input: kind === 'tags' ? { tagNames: ['핀테크'] } : { alternativeProductIds: ['alt-b'] },
    });
    await act(async () => fixture.reads.shift()!.resolve(fixture.product));
  });

  it('상품 없음과 정상 로드한 빈 목록을 구분한다', async () => {
    const fixture = setup(kind);
    await act(async () => fixture.reads.shift()!.resolve(null));
    expect(screen.getByText('상품을 찾을 수 없습니다.')).toBeTruthy();
    fixture.submit();
    expect(fixture.writes).toHaveLength(0);
    expect(fixture.save().disabled).toBe(true);
  });

  it('정상적으로 조회한 빈 목록은 저장할 수 있다', async () => {
    const fixture = setup(kind);
    await act(async () => fixture.reads.shift()!.resolve({ ...fixture.product, tags: [], alternatives: [] }));
    await waitFor(() => expect(fixture.save().disabled).toBe(false));
    fixture.submit();
    await waitFor(() => expect(fixture.writes).toHaveLength(1));
    await act(async () => fixture.reads.shift()!.resolve({ ...fixture.product, tags: [], alternatives: [] }));
  });
});
