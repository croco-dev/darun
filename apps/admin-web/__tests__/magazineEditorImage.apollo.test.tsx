// @vitest-environment jsdom
import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { MagazineEditSection } from '../features/magazines/MagazineEditSection/MagazineEditSection';

const { upload } = vi.hoisted(() => ({ upload: vi.fn() }));
vi.mock('@darun/utils-image-upload', () => ({ useImageUpload: () => ({ upload }) }));
vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));
vi.mock('@darun/utils-router', () => ({
  Link: ({ children, ...props }: React.ComponentProps<'a'>) => <a {...props}>{children}</a>,
}));
const clients: ApolloClient[] = [];
afterEach(() => {
  cleanup();
  clients.splice(0).forEach(client => client.stop());
  vi.clearAllMocks();
});

it.each(['success', 'reject', 'empty'] as const)(
  'waits for actual image upload %s before allowing save',
  async outcome => {
    let finish!: (url: string) => void;
    let reject!: (error: Error) => void;
    upload.mockImplementation(
      () =>
        new Promise<string>((resolve, fail) => {
          finish = resolve;
          reject = fail;
        })
    );
    const writes: Record<string, unknown>[] = [];
    const magazine = {
      __typename: 'Magazine',
      id: 'image-draft',
      slug: 'image-draft',
      title: '이미지 초안',
      summary: '',
      content: '<p>이미지를 포함할 본문</p>',
      publishedAt: null,
    };
    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: new ApolloLink(
        operation =>
          new Observable(observer => {
            if (operation.operationName === 'MagazineOnAdminEditor')
              observer.next({ data: { tempMagazineBySlug: magazine } });
            else {
              writes.push(operation.variables);
              observer.next({ data: { editMagazine: { magazine: { ...magazine, ...operation.variables.input } } } });
            }
            observer.complete();
          })
      ),
    });
    clients.push(client);
    const view = render(
      <ApolloProvider client={client}>
        <MagazineEditSection slug="image-draft" />
      </ApolloProvider>
    );
    await screen.findByDisplayValue('이미지 초안');
    await waitFor(() => expect(view.container.querySelector('.ProseMirror')).toBeTruthy());
    fireEvent.change(view.container.querySelector('input[type=file]')!, {
      target: { files: [new File(['synthetic'], 'figure.png', { type: 'image/png' })] },
    });
    await waitFor(() => expect(upload).toHaveBeenCalledTimes(1));
    expect(screen.getByRole<HTMLButtonElement>('button', { name: '저장' }).disabled).toBe(true);
    expect(screen.getByRole<HTMLButtonElement>('button', { name: '발행' }).disabled).toBe(true);
    fireEvent.submit(screen.getByLabelText('글 제목').closest('form')!);
    expect(writes).toHaveLength(0);
    await act(async () => {
      if (outcome === 'reject') reject(new Error('synthetic upload failure'));
      else finish(outcome === 'success' ? 'https://fixture.invalid/figure.png' : '');
    });
    if (outcome === 'success')
      await waitFor(() =>
        expect(view.container.querySelector('.ProseMirror img')?.getAttribute('src')).toBe(
          'https://fixture.invalid/figure.png'
        )
      );
    else expect(view.container.querySelector('.ProseMirror img')).toBeNull();
    expect(screen.getByRole<HTMLButtonElement>('button', { name: '저장' }).disabled).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]).toEqual({
      slug: 'image-draft',
      input: {
        title: '이미지 초안',
        summary: '',
        content:
          outcome === 'success'
            ? expect.stringContaining('<img src="https://fixture.invalid/figure.png"')
            : '<p>이미지를 포함할 본문</p>',
      },
    });
  }
);
