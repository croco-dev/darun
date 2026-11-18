import { ApolloClient, ApolloLink, InMemoryCache, Observable, type Operation } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { notifications } from '@mantine/notifications';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductLinkTable } from '../ProductLinkTable';

vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));

const researchLogo = 'https://linear.example/logo.png';
const initialLink = {
  __typename: 'Link',
  id: 'link-a',
  isPrimary: true,
  role: null,
  title: 'Original title',
  link: 'https://example.com',
  displayLink: 'example.com',
  iconUrl: researchLogo,
};
const otherLink = {
  ...initialLink,
  id: 'link-b',
  title: 'Other link',
  iconUrl: '/images/second-link.svg',
  isPrimary: false,
};
const clients: ApolloClient[] = [];

afterEach(() => {
  cleanup();
  clients.splice(0).forEach(client => client.stop());
  vi.clearAllMocks();
});

function setup({ failSave = false, delaySave = false, firstTitle = initialLink.title } = {}) {
  let links = [{ ...initialLink, title: firstTitle }, otherLink];
  const reads: Array<(error?: Error) => void> = [];
  const writes: Operation[] = [];
  const pendingSaves: Array<() => void> = [];
  const product = () => ({
    __typename: 'Product',
    id: 'product-a',
    links,
  });
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      operation =>
        new Observable(observer => {
          if (operation.operationName === 'TempProductBySlugOnProductLinkTable') {
            const readProduct = product();
            reads.push(error => {
              if (error) {
                observer.error(error);
                return;
              }
              observer.next({ data: { tempProductBySlug: readProduct } });
              observer.complete();
            });
          } else if (operation.operationName === 'UpdateProductLinkOnEditProductLinkItem') {
            writes.push(operation);
            if (failSave) {
              observer.error(new Error('fixture save failed'));
              return;
            }
            const complete = () => {
              const { id, input } = operation.variables;
              links = links.map(link => {
                const isPrimary = input.makePrimary ? link.id === id : link.isPrimary;
                if (link.id !== id) return { ...link, isPrimary };
                return {
                  ...link,
                  isPrimary,
                  title: input.title ?? link.title,
                  link: input.link ?? link.link,
                  displayLink: input.displayLink ?? link.displayLink,
                  iconUrl: input.iconUrl ?? link.iconUrl,
                  role: input.role === undefined ? link.role : input.role,
                };
              });
              observer.next({
                data: { updateProductLink: { product: product() } },
              });
              observer.complete();
            };
            if (delaySave) pendingSaves.push(complete);
            else complete();
          } else {
            observer.error(new Error(`Unexpected operation: ${operation.operationName}`));
          }
        })
    ),
  });
  clients.push(client);
  const view = () => (
    <ApolloProvider client={client}>
      <ProductLinkTable slug="fixture" />
    </ApolloProvider>
  );
  render(view());
  return {
    writes,
    resolveSave: async () => {
      await waitFor(() => expect(pendingSaves).toHaveLength(1));
      await act(async () => pendingSaves.shift()!());
    },
    refresh: () => client.refetchQueries({ include: 'active' }),
    waitForRead: () => waitFor(() => expect(reads).toHaveLength(1)),
    resolveRead: async (error?: Error) => {
      await waitFor(() => expect(reads).toHaveLength(1));
      await act(async () => reads.shift()!(error));
    },
  };
}

function edit(title: string) {
  const row = screen.getByText(title).closest('tr')!;
  fireEvent.click(within(row).getByText('정보 수정'));
}

const titleInput = () => screen.getByPlaceholderText<HTMLInputElement>('ex) 공식 홈페이지');
const dialog = () => screen.queryByRole('dialog', { name: '링크 정보 수정' });

function save() {
  fireEvent.click(screen.getByText('저장', { selector: 'button' }));
}

describe('상품 링크 재편집', () => {
  it('지연된 목록 재조회 후 같은 링크를 다시 열어도 직전 저장 이름을 유지한다', async () => {
    const fixture = setup();
    await fixture.resolveRead();

    edit('Original title');
    fireEvent.change(titleInput(), { target: { value: 'Updated title' } });
    save();
    await fixture.waitForRead();
    expect(dialog()).toBeNull();
    await fixture.resolveRead();

    edit('Updated title');
    expect(titleInput().value).toBe('Updated title');
    fireEvent.change(screen.getByPlaceholderText('ex) toss.im'), {
      target: { value: 'New display' },
    });
    save();
    await fixture.resolveRead();
    expect(fixture.writes.map(write => write.variables.input)).toEqual([
      { title: 'Updated title' },
      { displayLink: 'New display' },
    ]);
  });

  it('저장 응답을 기다리는 동안 같은 링크를 이전 값으로 다시 열 수 없다', async () => {
    const fixture = setup({ delaySave: true });
    await fixture.resolveRead();

    edit('Original title');
    fireEvent.change(titleInput(), { target: { value: 'Updated title' } });
    save();
    await screen.findByText('저장 중...', { selector: 'button' });

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(dialog()).toBeTruthy();
    fireEvent.click(within(dialog()!).getByRole('button', { name: '닫기' }));
    expect(dialog()).toBeTruthy();
    expect(titleInput().value).toBe('Updated title');

    await fixture.resolveSave();
    await fixture.resolveRead();
    edit('Updated title');
    expect(titleInput().value).toBe('Updated title');
    expect(fixture.writes).toHaveLength(1);
  });

  it('저장 전 값을 읽은 요청이 끝난 뒤 새로 조회한 값으로 편집한다', async () => {
    const fixture = setup({ delaySave: true });
    await fixture.resolveRead();

    edit('Original title');
    fireEvent.change(titleInput(), { target: { value: 'Updated title' } });
    save();
    await screen.findByText('저장 중...', { selector: 'button' });
    act(() => {
      void fixture.refresh();
    });
    await fixture.waitForRead();
    await fixture.resolveSave();
    expect(dialog()).toBeNull();

    await fixture.resolveRead();
    expect(screen.queryByText('Original title')).toBeNull();
    await fixture.resolveRead();

    edit('Updated title');
    expect(titleInput().value).toBe('Updated title');
    fireEvent.change(screen.getByPlaceholderText('ex) toss.im'), { target: { value: 'New display' } });
    save();
    await fixture.resolveSave();
    expect(fixture.writes[1]?.variables.input).toEqual({ displayLink: 'New display' });
    await fixture.resolveRead();
  });

  it('목록이 다시 조회되는 동안 초안을 유지하고 같은 링크를 새로 열 때는 저장값으로 시작한다', async () => {
    const fixture = setup();
    await fixture.resolveRead();

    edit('Original title');
    fireEvent.change(titleInput(), { target: { value: 'Discarded draft' } });
    act(() => {
      void fixture.refresh();
    });
    await fixture.waitForRead();
    expect(titleInput().value).toBe('Discarded draft');
    await fixture.resolveRead();
    expect(titleInput().value).toBe('Discarded draft');
    fireEvent.click(screen.getByText('취소', { selector: 'button' }));
    edit('Original title');
    expect(titleInput().value).toBe('Original title');
    fireEvent.click(screen.getByText('취소', { selector: 'button' }));
    edit('Other link');
    expect(titleInput().value).toBe('Other link');
  });

  it('저장 실패 시 초안을 유지하고 후속 조회를 시작하지 않는다', async () => {
    const fixture = setup({ failSave: true });
    await fixture.resolveRead();

    edit('Original title');
    fireEvent.change(titleInput(), { target: { value: 'Unsaved draft' } });
    save();
    await waitFor(() =>
      expect(notifications.show).toHaveBeenCalledWith({
        message: 'fixture save failed',
        color: 'red',
      })
    );
    expect(titleInput().value).toBe('Unsaved draft');
    expect(fixture.writes).toHaveLength(1);
  });

  it('한국어와 영어의 공개 문구 및 변경된 대표 순서를 저장 전에 미리 본다', async () => {
    const fixture = setup({ firstTitle: '공식 홈페이지' });
    await fixture.resolveRead();
    const researchIcon = screen.getByText('공식 홈페이지').closest('tr')?.querySelector('img');
    expect(researchIcon?.getAttribute('src')).toBe(researchLogo);
    expect(researchIcon?.getAttribute('referrerpolicy')).toBe('no-referrer');
    edit('공식 홈페이지');
    expect(
      within(dialog()!).getByRole('option', {
        name: '현재 아이콘',
        selected: true,
      })
    ).toHaveProperty('value', researchLogo);
    expect(within(dialog()!).getByRole('option', { name: '아이콘을 선택해 주세요' })).toHaveProperty('disabled', true);
    fireEvent.click(screen.getByText('취소', { selector: 'button' }));
    edit('Other link');
    const modal = within(dialog()!);
    fireEvent.change(modal.getByLabelText('링크 역할'), {
      target: { value: 'official' },
    });
    fireEvent.change(titleInput(), { target: { value: '' } });
    fireEvent.click(modal.getByLabelText('이 링크를 대표로 지정'));
    const preview = within(modal.getByRole('region', { name: '공개 링크 미리보기' }));
    const labels = (language: string) =>
      within(preview.getByRole('list', { name: language }))
        .getAllByRole('listitem')
        .map(item => item.textContent);
    expect(labels('한국어')).toEqual(['공식 사이트 (대표 링크)', '공식 홈페이지']);
    expect(labels('영어')).toEqual(['Official website (Primary link)', 'Official Website']);
    expect(fixture.writes).toHaveLength(0);

    save();
    await fixture.resolveRead();
    expect(fixture.writes[0].variables).toMatchObject({
      id: 'link-b',
      input: { title: '', role: 'official', makePrimary: true },
    });
    const primary = screen.getByText('공식 사이트').closest('tr')!;
    expect(within(primary).getByText('대표 링크')).toBeTruthy();
    expect(primary.querySelector('img')?.getAttribute('src')).toBe('/images/second-link.svg');
  });

  it('저장 성공과 재조회 실패를 구분하고 목록 재시도 후 저장값으로 편집한다', async () => {
    const fixture = setup();
    await fixture.resolveRead();

    edit('Original title');
    fireEvent.change(titleInput(), { target: { value: 'Updated title' } });
    save();
    await fixture.resolveRead(new Error('fixture read failed'));
    expect(await screen.findByText('다시 시도', { selector: 'button' })).toBeTruthy();
    expect(notifications.show).toHaveBeenCalledWith({
      message: '수정되었습니다.',
      color: 'teal',
    });
    expect(notifications.show).not.toHaveBeenCalledWith({
      message: 'fixture read failed',
      color: 'red',
    });
    expect(dialog()).toBeNull();

    fireEvent.click(screen.getByText('다시 시도', { selector: 'button' }));
    await fixture.resolveRead();
    edit('Updated title');
    expect(titleInput().value).toBe('Updated title');
    expect(fixture.writes).toHaveLength(1);
  });
});
