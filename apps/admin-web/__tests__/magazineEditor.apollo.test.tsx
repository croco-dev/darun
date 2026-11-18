// @vitest-environment jsdom
import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MagazineEditSection } from '../features/magazines/MagazineEditSection/MagazineEditSection';
import { installPreviewDialog, openDraftPreview } from './fixtures/draftPreview';

const { upload } = vi.hoisted(() => ({ upload: vi.fn() }));
vi.mock('@darun/utils-image-upload', () => ({
  useImageUpload: () => ({ upload }),
}));
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
  conflict: () => void;
}
const clients: ApolloClient[] = [];
afterEach(() => {
  cleanup();
  clients.splice(0).forEach(client => client.stop());
  upload.mockReset();
});
const draft = {
  __typename: 'Magazine',
  id: 'draft-a',
  revision: 0,
  slug: 'draft-a',
  title: '기존 제목',
  summary: '기존 요약',
  content: '<p>기존 본문</p>',
  backgroundImageUrl: 'https://fixture.invalid/original.png',
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
            conflict() {
              observer.next({
                errors: [
                  {
                    message: 'changed',
                    extensions: { code: 'magazine/revision-conflict' },
                  },
                ],
              });
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
  it('미발행 글의 편집값을 미리 본 뒤 저장 요청 없이 초안을 유지한다', async () => {
    const restoreDialog = installPreviewDialog();
    try {
      const fixture = setup();
      const query = await fixture.take('MagazineOnAdminEditor');
      await flush(() => query.resolve({ tempMagazineBySlug: draft }));
      const title = screen.getByLabelText<HTMLInputElement>('글 제목');
      const summary = screen.getByLabelText<HTMLInputElement>('한 줄 요약');
      const editor = screen.getByRole<HTMLTextAreaElement>('textbox', { name: '본문' });
      const content = '<h2>새 본문</h2><table><tbody><tr><th>기능</th><td>검색</td></tr></tbody></table>';
      fireEvent.change(title, { target: { value: '저장 전 제목' } });
      fireEvent.change(summary, { target: { value: '저장 전 요약' } });
      fireEvent.change(editor, { target: { value: content } });

      const { iframe, body } = openDraftPreview();
      expect(iframe.width).toBe('390');
      expect(body.getByRole('heading', { level: 1, name: '저장 전 제목' })).toBeDefined();
      expect(body.getByText('저장 전 요약')).toBeDefined();
      expect(body.getByRole('heading', { level: 2, name: '새 본문' })).toBeDefined();
      expect(body.getByRole('cell', { name: '검색' })).toBeDefined();
      expect(body.queryByRole('time')).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: '1280px' }));
      expect(iframe.width).toBe('1280');
      fireEvent.click(screen.getByRole('button', { name: '미리보기 닫기' }));

      expect(screen.queryByTitle('공개 화면')).toBeNull();
      expect(screen.queryByRole('link', { name: '공개 글 보기' })).toBeNull();
      expect(title.value).toBe('저장 전 제목');
      expect(summary.value).toBe('저장 전 요약');
      expect(editor.value).toBe(content);
      expect(screen.getByText(/저장하지 않은 변경사항/)).toBeDefined();
      expect(screen.getByRole<HTMLButtonElement>('button', { name: '발행' }).disabled).toBe(true);
      expect(fixture.requests).toEqual([]);
    } finally {
      restoreDialog();
    }
  });

  it.each([null, '2026-10-25T10:00:00Z'])(
    '배경만 교체하고 다시 열어도 저장한 배경을 표시한다 (발행일 %s)',
    async publishedAt => {
      const original = { ...draft, publishedAt };
      const fixture = setup();
      const query = await fixture.take('MagazineOnAdminEditor');
      await flush(() => query.resolve({ tempMagazineBySlug: original }));
      const uploadStatus = screen.getByRole('status', { name: '배경 이미지 업로드' });
      expect(uploadStatus.textContent).toBe('');
      expect(screen.getByRole('img', { name: '매거진 배경 이미지' }).getAttribute('src')).toBe(
        draft.backgroundImageUrl
      );

      const file = new File(['replacement'], 'replacement.png', {
        type: 'image/png',
      });
      const replacement = 'https://fixture.invalid/replacement.png';
      let finish!: (url: string) => void;
      upload.mockImplementationOnce(
        () =>
          new Promise<string>(resolve => {
            finish = resolve;
          })
      );
      fireEvent.change(screen.getByLabelText('배경 이미지 파일'), {
        target: { files: [file] },
      });
      expect(uploadStatus.textContent).toContain('배경 이미지를 업로드하고 있습니다.');
      expect(upload).toHaveBeenCalledWith('images/magazines', file, file.name);
      expect(screen.getByRole<HTMLButtonElement>('button', { name: '저장' }).disabled).toBe(true);
      if (!publishedAt) expect(screen.getByRole<HTMLButtonElement>('button', { name: '발행' }).disabled).toBe(true);
      fireEvent.submit(screen.getByLabelText('글 제목').closest('form')!);
      expect(fixture.requests).toHaveLength(0);
      await flush(() => finish(replacement));
      expect(uploadStatus.textContent).toBe('');
      expect(screen.getByRole('img', { name: '매거진 배경 이미지' }).getAttribute('src')).toBe(replacement);
      if (!publishedAt) expect(screen.getByRole<HTMLButtonElement>('button', { name: '발행' }).disabled).toBe(true);

      fireEvent.click(screen.getByRole('button', { name: '저장' }));
      const save = await fixture.take('EditMagazineOnAdminEditor');
      expect(save.variables.input).toEqual({
        expectedRevision: 0,
        backgroundImageUrl: replacement,
      });
      const saved = {
        ...original,
        revision: 1,
        backgroundImageUrl: replacement,
      };
      await flush(() => save.resolve({ editMagazine: { magazine: saved } }));
      fixture.rerender(
        <ApolloProvider client={fixture.client}>
          <MagazineEditSection key="reopened" slug="draft-a" />
        </ApolloProvider>
      );
      const reopen = await fixture.take('MagazineOnAdminEditor');
      await flush(() => reopen.resolve({ tempMagazineBySlug: saved }));
      expect(screen.getByRole('img', { name: '매거진 배경 이미지' }).getAttribute('src')).toBe(replacement);
      expect(screen.getByText(publishedAt ? '발행됨' : '초안(미발행)')).toBeTruthy();
    }
  );

  it('교체 실패 후 배경과 본문 초안을 유지하고 명시적 제거만 빈 배경을 보낸다', async () => {
    const fixture = setup();
    const query = await fixture.take('MagazineOnAdminEditor');
    await flush(() => query.resolve({ tempMagazineBySlug: draft }));
    const content = '<p>보존할 새 본문</p>';
    fireEvent.change(screen.getByRole('textbox', { name: '본문' }), {
      target: { value: content },
    });
    upload.mockResolvedValueOnce(undefined);
    fireEvent.change(screen.getByLabelText('배경 이미지 파일'), {
      target: {
        files: [new File(['failed'], 'failed.png', { type: 'image/png' })],
      },
    });
    expect((await screen.findByRole('alert')).textContent).toContain('배경 이미지를 업로드하지 못했습니다');
    expect(screen.getByRole('img', { name: '매거진 배경 이미지' }).getAttribute('src')).toBe(draft.backgroundImageUrl);
    expect(screen.getByRole<HTMLTextAreaElement>('textbox', { name: '본문' }).value).toBe(content);
    expect(fixture.requests).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: '배경 이미지 제거' }));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    const save = await fixture.take('EditMagazineOnAdminEditor');
    expect(save.variables.input).toMatchObject({
      backgroundImageUrl: '',
      content,
    });
    await flush(() =>
      save.resolve({
        editMagazine: {
          magazine: { ...draft, revision: 1, backgroundImageUrl: '', content },
        },
      })
    );
    expect(screen.queryByRole('img', { name: '매거진 배경 이미지' })).toBeNull();
  });

  it('배경만 바꾼 초안을 최신 버전으로 저장해도 다른 곳에서 바꾼 제목과 본문을 덮어쓰지 않는다', async () => {
    const fixture = setup();
    const query = await fixture.take('MagazineOnAdminEditor');
    await flush(() => query.resolve({ tempMagazineBySlug: draft }));
    fireEvent.click(screen.getByRole('button', { name: '배경 이미지 제거' }));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    const firstSave = await fixture.take('EditMagazineOnAdminEditor');
    await flush(() => firstSave.conflict());
    fireEvent.click(screen.getByRole('button', { name: '최신 저장본 확인' }));
    const read = await fixture.take('MagazineOnAdminEditor');
    const latest = {
      ...draft,
      revision: 3,
      title: '다른 곳에서 바꾼 제목',
      content: '<p>최신 본문</p>',
    };
    await flush(() => read.resolve({ tempMagazineBySlug: latest }));
    fireEvent.click(screen.getByRole('button', { name: '최신 버전을 기준으로 내 초안 유지' }));
    expect(screen.getByLabelText<HTMLInputElement>('글 제목').value).toBe(latest.title);
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    const retry = await fixture.take('EditMagazineOnAdminEditor');
    expect(retry.variables.input).toEqual({
      expectedRevision: 3,
      backgroundImageUrl: '',
    });
  });

  it('같은 배경 제거가 이미 저장됐으면 충돌을 해결한 뒤 다시 쓰지 않는다', async () => {
    const fixture = setup();
    const query = await fixture.take('MagazineOnAdminEditor');
    await flush(() => query.resolve({ tempMagazineBySlug: { ...draft, summary: null } }));
    fireEvent.click(screen.getByRole('button', { name: '배경 이미지 제거' }));
    const saveButton = screen.getByRole<HTMLButtonElement>('button', { name: '저장' });
    fireEvent.click(saveButton);
    const firstSave = await fixture.take('EditMagazineOnAdminEditor');
    await flush(() => firstSave.conflict());
    fireEvent.click(screen.getByRole('button', { name: '최신 저장본 확인' }));
    const read = await fixture.take('MagazineOnAdminEditor');
    await flush(() =>
      read.resolve({ tempMagazineBySlug: { ...draft, revision: 1, backgroundImageUrl: '', summary: null } })
    );
    fireEvent.click(screen.getByRole('button', { name: '최신 버전을 기준으로 내 초안 유지' }));
    expect(saveButton.disabled).toBe(true);
    fireEvent.submit(saveButton.closest('form')!);
    expect(fixture.requests).toHaveLength(0);
  });

  it('배경 업로드 완료와 제목 입력이 겹치면 두 변경을 함께 저장한다', async () => {
    const fixture = setup();
    const query = await fixture.take('MagazineOnAdminEditor');
    await flush(() => query.resolve({ tempMagazineBySlug: draft }));
    let finish!: (url: string) => void;
    upload.mockImplementationOnce(
      () =>
        new Promise<string>(resolve => {
          finish = resolve;
        })
    );
    fireEvent.change(screen.getByLabelText('배경 이미지 파일'), {
      target: { files: [new File(['replacement'], 'replacement.png', { type: 'image/png' })] },
    });
    const replacement = 'https://fixture.invalid/replacement.png';
    await act(async () => {
      finish(replacement);
      await new Promise<void>(resolve =>
        queueMicrotask(() => {
          fireEvent.change(screen.getByLabelText('글 제목'), { target: { value: '업로드 중 바꾼 제목' } });
          resolve();
        })
      );
    });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    const save = await fixture.take('EditMagazineOnAdminEditor');
    expect(save.variables.input).toMatchObject({ title: '업로드 중 바꾼 제목', backgroundImageUrl: replacement });
  });

  it('큰 표의 저장을 거절한 뒤 원문을 유지하고 정상 본문으로 복구한다', async () => {
    const fixture = setup();
    const query = await fixture.take('MagazineOnAdminEditor');
    await flush(() => query.resolve({ tempMagazineBySlug: draft }));
    const html = '<table><tr><td colspan="600">A</td><td colspan="401">B</td></tr></table>';
    fireEvent.change(screen.getByRole('textbox', { name: '본문' }), {
      target: { value: html },
    });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect((await screen.findByRole('alert')).textContent).toContain('표');
    expect(fixture.requests).toHaveLength(0);
    expect((screen.getByRole('textbox', { name: '본문' }) as HTMLTextAreaElement).value).toBe(html);

    fireEvent.change(screen.getByRole('textbox', { name: '본문' }), {
      target: { value: '<p>복구한 초안</p>' },
    });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    const save = await fixture.take('EditMagazineOnAdminEditor');
    expect(save.variables.input).toMatchObject({
      content: '<p>복구한 초안</p>',
    });
    await flush(() =>
      save.resolve({
        editMagazine: { magazine: { ...draft, content: '<p>복구한 초안</p>' } },
      })
    );
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
        expectedRevision: 0,
        title: '새 제목',
        summary: '',
        content: '<h2>새 본문</h2><p>내용</p>',
      },
    });
    const saved = {
      ...draft,
      ...(save.variables.input as object),
      revision: 1,
    };
    expect(screen.getByLabelText<HTMLInputElement>('글 제목').disabled).toBe(true);
    await flush(() => save.resolve({ editMagazine: { magazine: saved } }));
    expect(screen.getByRole('status', { name: '' }).textContent).toContain('저장했습니다');
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
    expect(publish.variables).toEqual({
      input: { slug: 'draft-a', expectedRevision: 1 },
    });
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
    expect(screen.queryByRole('status', { name: '' })).toBeNull();
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

it.each(['save', 'publish'] as const)(
  '오래된 %s의 입력을 유지하고 최신본 확인 후 명시적으로 복구한다',
  async action => {
    const fixture = setup();
    const query = await fixture.take('MagazineOnAdminEditor');
    await flush(() => query.resolve({ tempMagazineBySlug: draft }));
    if (action === 'save')
      fireEvent.change(screen.getByLabelText('글 제목'), {
        target: { value: 'B의 초안' },
      });
    fireEvent.click(screen.getByRole('button', { name: action === 'save' ? '저장' : '발행' }));
    const attempt = await fixture.take(
      action === 'save' ? 'EditMagazineOnAdminEditor' : 'PublishMagazineOnAdminEditor'
    );
    expect(attempt.variables.input).toMatchObject({ expectedRevision: 0 });
    await flush(() => attempt.conflict());
    expect(screen.getByRole('alert').textContent).toContain('최신 저장본');
    expect(screen.getByLabelText<HTMLInputElement>('글 제목').value).toBe(action === 'save' ? 'B의 초안' : '기존 제목');
    expect(screen.getByRole<HTMLButtonElement>('button', { name: '저장' }).disabled).toBe(true);
    expect(screen.getByRole<HTMLButtonElement>('button', { name: '발행' }).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '최신 저장본 확인' }));
    const readFailure = await fixture.take('MagazineOnAdminEditor');
    await flush(() => readFailure.fail());
    expect(screen.getByLabelText<HTMLInputElement>('글 제목').value).toBe(action === 'save' ? 'B의 초안' : '기존 제목');
    fireEvent.click(screen.getByRole('button', { name: '최신 저장본 확인' }));
    const read = await fixture.take('MagazineOnAdminEditor');
    const latest = {
      ...draft,
      title: 'A의 최신 제목',
      content: '<p>A의 최신 본문</p>',
      backgroundImageUrl: 'https://fixture.invalid/latest.png',
      revision: 4,
    };
    await flush(() => read.resolve({ tempMagazineBySlug: latest }));
    expect(screen.getByText('제목: A의 최신 제목')).toBeTruthy();
    expect(screen.getByRole<HTMLButtonElement>('button', { name: '저장' }).disabled).toBe(true);
    fireEvent.click(
      screen.getByRole('button', {
        name: action === 'save' ? '최신 버전을 기준으로 내 초안 유지' : '내 입력을 최신 저장본으로 바꾸기',
      })
    );
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('img', { name: '매거진 배경 이미지' }).getAttribute('src')).toBe(latest.backgroundImageUrl);
    expect(screen.getByLabelText<HTMLInputElement>('글 제목').value).toBe(
      action === 'save' ? 'B의 초안' : 'A의 최신 제목'
    );
    fireEvent.click(screen.getByRole('button', { name: action === 'save' ? '저장' : '발행' }));
    const retry = await fixture.take(action === 'save' ? 'EditMagazineOnAdminEditor' : 'PublishMagazineOnAdminEditor');
    expect(retry.variables.input).toMatchObject({ expectedRevision: 4 });
    if (action === 'save')
      expect(retry.variables.input).toMatchObject({
        title: 'B의 초안',
        content: draft.content,
      });
    else
      expect(retry.variables.input).toEqual({
        slug: 'draft-a',
        expectedRevision: 4,
      });
  }
);
