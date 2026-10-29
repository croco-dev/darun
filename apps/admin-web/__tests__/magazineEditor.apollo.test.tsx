// @vitest-environment jsdom
import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MagazineEditSection } from '../features/magazines/MagazineEditSection/MagazineEditSection';

vi.mock('@darun/utils-router', () => ({
  Link: ({ children, ...props }: React.ComponentProps<'a'>) => <a {...props}>{children}</a>,
}));
vi.mock('@darun/ui-admin', async original => ({
  ...(await original<Record<string, unknown>>()),
  Editor: ({ value, onChange, disabled }: { value: string; onChange: (value: string) => void; disabled: boolean }) => (
    <textarea aria-label="본문" value={value} onChange={e => onChange(e.target.value)} disabled={disabled} />
  ),
}));
interface Request {
  name: string;
  variables: Record<string, unknown>;
  resolve: (data: Record<string, unknown>) => void;
  fail: () => void;
}
const clients: ApolloClient[] = [];
afterEach(() => {
  cleanup();
  clients.splice(0).forEach(client => client.stop());
});
const draft = {
  __typename: 'Magazine',
  id: 'draft-a',
  slug: 'draft-a',
  title: '기존 제목',
  summary: '기존 요약',
  content: '<p>기존 본문</p>',
  publishedAt: null,
};
function setup() {
  const requests: Request[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      operation =>
        new Observable(observer => {
          requests.push({
            name: operation.operationName ?? '',
            variables: operation.variables,
            resolve(data) {
              observer.next({ data });
              observer.complete();
            },
            fail() {
              observer.error(new Error('synthetic failure'));
            },
          });
        })
    ),
  });
  clients.push(client);
  const view = render(
    <ApolloProvider client={client}>
      <MagazineEditSection slug="draft-a" />
    </ApolloProvider>
  );
  return {
    ...view,
    client,
    requests,
    async take(name: string) {
      await waitFor(() => expect(requests.some(r => r.name === name)).toBe(true));
      return requests.splice(
        requests.findIndex(r => r.name === name),
        1
      )[0]!;
    },
  };
}
const flush = async (fn: () => void) => {
  await act(async () => {
    fn();
  });
};

describe('magazine draft editor with real Apollo operations', () => {
  it('큰 표의 저장을 거절한 뒤 원문을 유지하고 정상 본문으로 복구한다', async () => {
    const fixture = setup();
    const query = await fixture.take('MagazineOnAdminEditor');
    await flush(() => query.resolve({ tempMagazineBySlug: draft }));
    const html = '<table><tr><td colspan="600">A</td><td colspan="401">B</td></tr></table>';
    fireEvent.change(screen.getByRole('textbox', { name: '본문' }), { target: { value: html } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect((await screen.findByRole('alert')).textContent).toContain('표');
    expect(fixture.requests).toHaveLength(0);
    expect((screen.getByRole('textbox', { name: '본문' }) as HTMLTextAreaElement).value).toBe(html);

    fireEvent.change(screen.getByRole('textbox', { name: '본문' }), { target: { value: '<p>복구한 초안</p>' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    const save = await fixture.take('EditMagazineOnAdminEditor');
    expect(save.variables.input).toMatchObject({ content: '<p>복구한 초안</p>' });
    await flush(() => save.resolve({ editMagazine: { magazine: { ...draft, content: '<p>복구한 초안</p>' } } }));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('saves the complete draft, reads it after reopening, and publishes only on explicit action', async () => {
    const fixture = setup();
    await flush(() => {});
    const query = await fixture.take('MagazineOnAdminEditor');
    await flush(() => query.resolve({ tempMagazineBySlug: draft }));
    fireEvent.change(screen.getByLabelText('글 제목'), {
      target: { value: '새 제목' },
    });
    fireEvent.change(screen.getByLabelText('한 줄 요약'), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: '본문' }), {
      target: { value: '<h2>새 본문</h2><p>내용</p>' },
    });
    expect(screen.getByRole<HTMLButtonElement>('button', { name: '발행' }).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    const save = await fixture.take('EditMagazineOnAdminEditor');
    expect(save.variables).toEqual({
      slug: 'draft-a',
      input: {
        title: '새 제목',
        summary: '',
        content: '<h2>새 본문</h2><p>내용</p>',
      },
    });
    const saved = { ...draft, ...(save.variables.input as object) };
    expect(screen.getByLabelText<HTMLInputElement>('글 제목').disabled).toBe(true);
    await flush(() => save.resolve({ editMagazine: { magazine: saved } }));
    expect(screen.getByRole('status').textContent).toContain('저장했습니다');
    expect(screen.getByText('초안(미발행)')).toBeTruthy();
    expect(fixture.requests.some(r => r.name === 'PublishMagazineOnAdminEditor')).toBe(false);
    fixture.rerender(
      <ApolloProvider client={fixture.client}>
        <MagazineEditSection key="reopened" slug="draft-a" />
      </ApolloProvider>
    );
    const reopen = await fixture.take('MagazineOnAdminEditor');
    await flush(() => reopen.resolve({ tempMagazineBySlug: saved }));
    expect(screen.getByLabelText<HTMLInputElement>('글 제목').value).toBe('새 제목');
    expect(screen.getByRole<HTMLTextAreaElement>('textbox', { name: '본문' }).value).toBe(
      '<h2>새 본문</h2><p>내용</p>'
    );
    fireEvent.click(screen.getByRole('button', { name: '발행' }));
    const publish = await fixture.take('PublishMagazineOnAdminEditor');
    expect(publish.variables).toEqual({ input: { slug: 'draft-a' } });
    await flush(() =>
      publish.resolve({
        publishMagazine: {
          magazine: { ...saved, publishedAt: '2026-10-25T10:00:00Z' },
        },
      })
    );
    expect(screen.getByText('발행됨')).toBeTruthy();
    expect(screen.getByRole('link', { name: '공개 글 보기' }).getAttribute('href')).toBe(
      'https://darun.io/ko/magazines/draft-a'
    );
    expect(screen.queryByRole('button', { name: '발행' })).toBeNull();
  });

  it('preserves edits on save failure, blocks duplicate writes, and retries without publishing', async () => {
    const fixture = setup();
    const query = await fixture.take('MagazineOnAdminEditor');
    await flush(() => query.resolve({ tempMagazineBySlug: draft }));
    fireEvent.change(screen.getByLabelText('글 제목'), {
      target: { value: '보존할 제목' },
    });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    const save = await fixture.take('EditMagazineOnAdminEditor');
    fireEvent.submit(screen.getByLabelText('글 제목').closest('form')!);
    expect(fixture.requests).toHaveLength(0);
    await flush(() => save.fail());
    expect(screen.getByRole('alert').textContent).toContain('입력한 내용은 유지');
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByLabelText<HTMLInputElement>('글 제목').value).toBe('보존할 제목');
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    const retry = await fixture.take('EditMagazineOnAdminEditor');
    expect(retry.variables).toEqual(save.variables);
    await flush(() =>
      retry.resolve({
        editMagazine: { magazine: { ...draft, title: '보존할 제목' } },
      })
    );
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('초안(미발행)')).toBeTruthy();
  });

  it('keeps a failed publication as a draft and can retry it', async () => {
    const fixture = setup();
    const query = await fixture.take('MagazineOnAdminEditor');
    await flush(() => query.resolve({ tempMagazineBySlug: draft }));
    fireEvent.click(screen.getByRole('button', { name: '발행' }));
    const publish = await fixture.take('PublishMagazineOnAdminEditor');
    await flush(() => publish.fail());
    expect(screen.getByRole('alert').textContent).toContain('저장된 초안은 유지');
    expect(screen.getByText('초안(미발행)')).toBeTruthy();
    expect(screen.queryByRole('link', { name: '공개 글 보기' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '발행' }));
    const retry = await fixture.take('PublishMagazineOnAdminEditor');
    await flush(() =>
      retry.resolve({
        publishMagazine: {
          magazine: { ...draft, publishedAt: '2026-10-25T10:00:00Z' },
        },
      })
    );
    expect(screen.getByText('발행됨')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('keeps query errors distinct from a missing magazine and retries loading before allowing writes', async () => {
    const fixture = setup();
    const query = await fixture.take('MagazineOnAdminEditor');
    await flush(() => query.fail());
    expect(screen.queryByRole('button', { name: '저장' })).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    const retry = await fixture.take('MagazineOnAdminEditor');
    await flush(() => retry.resolve({ tempMagazineBySlug: null }));
    expect(screen.getByText('매거진을 찾을 수 없습니다.')).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
  });
});
