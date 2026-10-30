import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { notifications } from '@mantine/notifications';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EditProductDescription } from '../EditProductDescription';

const { upload } = vi.hoisted(() => ({ upload: vi.fn() }));
vi.mock('@darun/utils-image-upload', () => ({
  useImageUpload: () => ({ upload }),
}));
vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

function deferredUpload() {
  let resolve!: (url: string) => void;
  const promise = new Promise<string>(complete => {
    resolve = complete;
  });
  upload.mockReturnValueOnce(promise);
  return resolve;
}

function fixture() {
  const stored = new Map([
    ['first', '<p>첫 상품의 소개</p>'],
    ['second', '<p>두 번째 상품의 소개</p>'],
  ]);
  const writes: { slug: string; description: string }[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      operation =>
        new Observable(observer => {
          const slug = operation.variables.slug as string;
          if (operation.operationName === 'EditProductOnEditProductDescription') {
            const description = operation.variables.input.description as string;
            writes.push({ slug, description });
            stored.set(slug, description);
          }
          const product = {
            __typename: 'Product',
            id: slug,
            description: stored.get(slug),
          };
          observer.next({
            data:
              operation.operationName === 'EditProductOnEditProductDescription'
                ? { editProduct: { __typename: 'EditProductPayload', product } }
                : { tempProductBySlug: product },
          });
          observer.complete();
        })
    ),
  });
  const ui = (slug: string) => (
    <ApolloProvider client={client}>
      <EditProductDescription slug={slug} onCancel={vi.fn()} />
    </ApolloProvider>
  );
  const view = render(ui('first'));
  const selectImage = () => {
    fireEvent.change(screen.getByLabelText('본문 이미지 업로드'), {
      target: {
        files: [new File(['image'], 'screen.png', { type: 'image/png' })],
      },
    });
  };
  return { client, view, writes, ui, selectImage };
}

describe('본문 이미지 업로드와 상품 소개 저장', () => {
  it('업로드 중 클릭·직접 submit을 막고 삽입한 이미지가 포함된 본문을 저장한다', async () => {
    const complete = deferredUpload();
    const f = fixture();
    try {
      await screen.findByText('첫 상품의 소개');
      f.selectImage();
      expect((screen.getByRole('button', { name: '저장' }) as HTMLButtonElement).disabled).toBe(true);
      expect((screen.getByRole('button', { name: '취소' }) as HTMLButtonElement).disabled).toBe(true);
      fireEvent.click(screen.getByRole('button', { name: '저장' }));
      fireEvent.submit(f.view.container.querySelector('form')!);
      expect(f.writes).toEqual([]);
      await act(async () => complete('https://example.com/first.png'));
      await waitFor(() => expect(f.view.container.querySelector('img')?.src).toBe('https://example.com/first.png'));
      fireEvent.click(screen.getByRole('button', { name: '저장' }));
      await waitFor(() => expect(f.writes).toHaveLength(1));
      const saved = new DOMParser().parseFromString(f.writes[0].description, 'text/html');
      expect(saved.body.textContent).toContain('첫 상품의 소개');
      expect(saved.querySelector('img')?.src).toBe('https://example.com/first.png');
      expect(f.writes[0].slug).toBe('first');
    } finally {
      f.view.unmount();
      f.client.stop();
    }
  });

  it('업로드 실패 후 본문을 보존하고 같은 파일 재시도와 저장을 허용한다', async () => {
    const fail = deferredUpload();
    const f = fixture();
    try {
      await screen.findByText('첫 상품의 소개');
      f.selectImage();
      await act(async () => fail(''));
      expect(screen.getByText('첫 상품의 소개')).toBeTruthy();
      expect(f.view.container.querySelector('img')).toBeNull();
      expect((screen.getByRole('button', { name: '저장' }) as HTMLButtonElement).disabled).toBe(false);
      expect(notifications.show).toHaveBeenCalledWith(expect.objectContaining({ color: 'red' }));
      const retry = deferredUpload();
      f.selectImage();
      await act(async () => retry('https://example.com/retry.png'));
      fireEvent.click(screen.getByRole('button', { name: '저장' }));
      await waitFor(() => expect(f.writes).toHaveLength(1));
      expect(f.writes[0].description).toContain('https://example.com/retry.png');
      expect(upload).toHaveBeenCalledTimes(2);
    } finally {
      f.view.unmount();
      f.client.stop();
    }
  });

  it('상품을 전환한 뒤 이전 업로드가 새 본문이나 진행 상태를 바꾸지 않는다', async () => {
    const firstUpload = deferredUpload();
    const f = fixture();
    try {
      await screen.findByText('첫 상품의 소개');
      f.selectImage();
      f.view.rerender(f.ui('second'));
      await screen.findByText('두 번째 상품의 소개');
      expect((screen.getByRole('button', { name: '저장' }) as HTMLButtonElement).disabled).toBe(false);
      const secondUpload = deferredUpload();
      f.selectImage();
      vi.mocked(notifications.show).mockClear();
      await act(async () => firstUpload('https://example.com/stale.png'));
      expect(f.view.container.querySelector('img')).toBeNull();
      expect((screen.getByRole('button', { name: '저장' }) as HTMLButtonElement).disabled).toBe(true);
      expect(notifications.show).not.toHaveBeenCalled();
      fireEvent.submit(f.view.container.querySelector('form')!);
      expect(f.writes).toEqual([]);
      await act(async () => secondUpload('https://example.com/second.png'));
      fireEvent.click(screen.getByRole('button', { name: '저장' }));
      await waitFor(() => expect(f.writes).toHaveLength(1));
      expect(f.writes[0].slug).toBe('second');
      expect(f.writes[0].description).toContain('https://example.com/second.png');
      expect(f.writes[0].description).not.toContain('stale.png');
    } finally {
      f.view.unmount();
      f.client.stop();
    }
  });
});
