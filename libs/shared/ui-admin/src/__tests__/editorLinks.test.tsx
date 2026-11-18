import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { Editor } from '@tiptap/react';
import { afterEach, expect, it, vi } from 'vitest';
import { AdminModal } from '../AdminModal';
import { Editor as AdminEditor } from '../Editor/Editor';
import { createAdminEditorExtensions } from '../Editor/extensions';
import { MenuBar } from '../Editor/MenuBar';

vi.mock('@darun/utils-image-upload', () => ({
  useImageUpload: () => ({ upload: vi.fn() }),
}));

const editors: Editor[] = [];
const firstUrl = 'https://example.com/install';
const nextUrl = 'http://example.org/help?os=ios&from=guide';

function setup(content: string, position: number | { from: number; to: number }, disabled = false) {
  const editor = new Editor({
    content,
    extensions: createAdminEditorExtensions(),
    editable: !disabled,
  });
  editors.push(editor);
  editor.commands.setTextSelection(position);
  const onUpdate = vi.fn();
  editor.on('update', onUpdate);
  render(<MenuBar editor={editor} disabled={disabled} />);
  return { editor, onUpdate };
}

function openLink() {
  fireEvent.click(screen.getByRole('button', { name: '본문 링크 편집' }));
  return within(screen.getByRole('dialog', { name: '본문 링크 편집' }));
}

function updateUrl(dialog: ReturnType<typeof within>, value: string) {
  fireEvent.change(dialog.getByLabelText('링크 주소'), { target: { value } });
}

afterEach(() => {
  cleanup();
  for (const editor of editors.splice(0)) editor.destroy();
  vi.unstubAllGlobals();
});

it('links the original selected text and reopens the saved href and label', () => {
  const { editor, onUpdate } = setup('<p>먼저 <strong>설치 가이드</strong>를 읽으세요.</p>', { from: 4, to: 10 });
  const dialog = openLink();
  expect(dialog.getByDisplayValue('설치 가이드')).toBeTruthy();
  updateUrl(dialog, firstUrl);
  fireEvent.click(dialog.getByRole('button', { name: '링크 적용' }));
  expect(onUpdate).toHaveBeenCalledTimes(1);
  const saved = editor.getHTML();
  const anchor = new DOMParser().parseFromString(saved, 'text/html').querySelector('a');
  expect(anchor?.textContent).toBe('설치 가이드');
  expect(anchor?.getAttribute('href')).toBe(firstUrl);
  expect(anchor?.getAttribute('target')).toBe('_blank');
  expect(anchor?.getAttribute('rel')).toBe('noopener noreferrer');
  act(() => {
    editor.commands.setContent(saved, false);
    editor.commands.setTextSelection(6);
  });
  const reopened = openLink();
  expect(reopened.getByDisplayValue(firstUrl)).toBeTruthy();
  expect(reopened.getByDisplayValue('설치 가이드')).toBeTruthy();
});

it('uses the browser selection when the keyboard shortcut arrives before selectionchange', async () => {
  const onChange = vi.fn();
  const view = render(
    <AdminEditor defaultValue={`<p><a href="${firstUrl}">guide</a> <em>after</em></p>`} onChange={onChange} />
  );
  await screen.findByRole('button', { name: '본문 링크 편집' });
  const surface = view.container.querySelector('.ProseMirror') as HTMLElement & { editor: Editor };
  const after = surface.querySelector('em')!.firstChild!;
  act(() => {
    surface.editor.commands.setTextSelection({ from: 1, to: 6 });
    surface.editor.view.focus();
    window.getSelection()!.setBaseAndExtent(after, 0, after, 5);
    fireEvent.keyDown(surface, { key: 'k', ctrlKey: true });
  });
  const dialog = within(screen.getByRole('dialog', { name: '본문 링크 편집' }));
  expect(dialog.getByDisplayValue('after')).toBeTruthy();
  updateUrl(dialog, nextUrl);
  fireEvent.click(dialog.getByRole('button', { name: '링크 적용' }));
  expect(onChange).toHaveBeenCalledTimes(1);
  const links = surface.querySelectorAll('a');
  expect(Array.from(links, link => [link.textContent, link.getAttribute('href')])).toEqual([
    ['guide', firstUrl],
    ['after', nextUrl],
  ]);
});

it('updates and removes the complete link inside emphasized list text', () => {
  const { editor } = setup(
    `<ul><li><p>읽기: <a href="${firstUrl}"><strong>설치</strong> 가이드</a> (iOS)</p></li></ul>`,
    8
  );
  const dialog = openLink();
  expect(dialog.getByDisplayValue('설치 가이드')).toBeTruthy();
  updateUrl(dialog, nextUrl);
  fireEvent.click(dialog.getByRole('button', { name: '링크 적용' }));
  expect(editor.getHTML()).toContain('href="http://example.org/help?os=ios&amp;from=guide"');
  expect(editor.view.dom.querySelector('ul li a strong')?.textContent).toBe('설치');
  expect(editor.view.dom.querySelector('ul li')?.textContent).toBe('읽기: 설치 가이드 (iOS)');
  const reopened = openLink();
  fireEvent.click(reopened.getByRole('button', { name: '링크 해제' }));
  expect(editor.getHTML()).toBe('<ul><li><p>읽기: <strong>설치</strong> 가이드 (iOS)</p></li></ul>');
});

it('keeps pending formatting and types outside a link after editing its address from the end', () => {
  const { editor } = setup(`<p><a href="${firstUrl}">설치 가이드</a></p>`, 7);
  fireEvent.click(screen.getByRole('button', { name: 'B' }));
  const dialog = openLink();
  updateUrl(dialog, nextUrl);
  fireEvent.click(dialog.getByRole('button', { name: '링크 적용' }));
  act(() => editor.commands.insertContent(' 일반 문장'));
  expect(editor.view.dom.querySelector('a')?.textContent).toBe('설치 가이드');
  expect(editor.view.dom.querySelector('p > strong')?.textContent).toBe(' 일반 문장');
});

it('keeps pending formatting and the new address if typing inside the edited link', () => {
  const { editor } = setup(`<p><a href="${firstUrl}">설치 가이드</a></p>`, 3);
  fireEvent.click(screen.getByRole('button', { name: 'B' }));
  const dialog = openLink();
  updateUrl(dialog, nextUrl);
  fireEvent.click(dialog.getByRole('button', { name: '링크 적용' }));
  act(() => editor.commands.insertContent(' 안내'));
  const anchors = editor.view.dom.querySelectorAll('a');
  expect(anchors).toHaveLength(1);
  expect(anchors[0].getAttribute('href')).toBe(nextUrl);
  expect(anchors[0].querySelector('strong')?.textContent).toBe(' 안내');
});

it('rejects an unsafe or incomplete address and ignores cancelled changes', () => {
  const { editor, onUpdate } = setup(`<p><a href="${firstUrl}">설치 가이드</a></p>`, 4);
  const before = editor.getHTML();
  const dialog = openLink();
  const address = dialog.getByLabelText('링크 주소');
  const label = dialog.getByLabelText('표시 문구');
  fireEvent.change(label, { target: { value: '   ' } });
  fireEvent.keyDown(label, { key: 'Enter' });
  expect(dialog.getByRole('alert').textContent).toContain('표시 문구');
  fireEvent.change(label, { target: { value: '설치 가이드' } });
  for (const value of ['javascript:alert(1)', 'https:example.com', 'https://', 'https://example.com/a\u0000b']) {
    updateUrl(dialog, value);
    fireEvent.keyDown(address, { key: 'Enter' });
    expect(dialog.getByRole('alert').textContent).toContain('http://');
  }
  fireEvent.keyDown(address, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(editor.getHTML()).toBe(before);
  expect(onUpdate).not.toHaveBeenCalled();
});

it('inserts the label as literal text at a caret in a table', () => {
  const { editor } = setup('<table><tbody><tr><td><p>앞뒤</p></td></tr></tbody></table>', 5);
  const dialog = openLink();
  fireEvent.change(dialog.getByLabelText('표시 문구'), {
    target: { value: '<b>도움말</b>' },
  });
  updateUrl(dialog, firstUrl);
  fireEvent.keyDown(dialog.getByLabelText('링크 주소'), { key: 'Enter' });
  const cell = editor.view.dom.querySelector('td');
  expect(cell?.textContent).toBe('앞<b>도움말</b>뒤');
  expect(cell?.querySelector('a')?.textContent).toBe('<b>도움말</b>');
  expect(cell?.querySelector('b')).toBeNull();
  act(() => editor.commands.insertContent(' 일반 본문'));
  expect(cell?.querySelector('a')?.textContent).toBe('<b>도움말</b>');
  expect(cell?.textContent).toBe('앞<b>도움말</b> 일반 본문뒤');
});

it('edits and unlinks an existing link with a line break without changing its contents', () => {
  const { editor } = setup(`<p>앞 <a href="${firstUrl}"><strong>설치</strong><br>가이드</a> 뒤</p>`, 5);
  const dialog = openLink();
  expect(dialog.getByDisplayValue('설치 가이드')).toBeTruthy();
  updateUrl(dialog, nextUrl);
  fireEvent.click(dialog.getByRole('button', { name: '링크 적용' }));
  const anchor = editor.view.dom.querySelector('a');
  expect(anchor?.getAttribute('href')).toBe(nextUrl);
  expect(anchor?.innerHTML).toBe('<strong>설치</strong><br>가이드');
  fireEvent.click(openLink().getByRole('button', { name: '링크 해제' }));
  expect(editor.getHTML()).toBe('<p>앞 <strong>설치</strong><br>가이드 뒤</p>');
});

it('keeps pending caret formatting after escaping the link fields', () => {
  const { editor, onUpdate } = setup('<p>앞뒤</p>', 2);
  fireEvent.click(screen.getByRole('button', { name: 'B' }));
  const dialog = openLink();
  fireEvent.keyDown(dialog.getByLabelText('표시 문구'), { key: 'Escape' });
  expect(editor.getHTML()).toBe('<p>앞뒤</p>');
  expect(onUpdate).not.toHaveBeenCalled();
  act(() => editor.commands.insertContent('굵게'));
  expect(editor.getHTML()).toBe('<p>앞<strong>굵게</strong>뒤</p>');
});

it('cancels the link dialog before the containing modal when focus has moved outside the link fields', () => {
  const initial = `<p>편집 중인 본문 <a href="${firstUrl}">설치 가이드</a></p>`;
  const editor = new Editor({ content: initial, extensions: createAdminEditorExtensions() });
  editors.push(editor);
  editor.commands.setTextSelection(12);
  const onClose = vi.fn();
  render(
    <AdminModal opened title="상품 소개 편집" onClose={onClose}>
      <MenuBar editor={editor} />
    </AdminModal>
  );
  updateUrl(openLink(), nextUrl);
  const closeModal = screen.getByRole('button', { name: '닫기' });
  closeModal.focus();
  fireEvent.keyDown(closeModal, { key: 'Escape' });
  expect(screen.queryByRole('dialog', { name: '본문 링크 편집' })).toBeNull();
  expect(onClose).not.toHaveBeenCalled();
  expect(editor.view.dom.querySelector('a')?.getAttribute('href')).toBe(firstUrl);
  fireEvent.keyDown(closeModal, { key: 'Escape' });
  expect(onClose).toHaveBeenCalledTimes(1);
});

it('discards unapplied link fields when the product modal hides a still-mounted editor', () => {
  const editor = new Editor({
    content: `<p>편집 중인 본문 <a href="${firstUrl}">설치 가이드</a></p>`,
    extensions: createAdminEditorExtensions(),
  });
  editors.push(editor);
  editor.commands.setTextSelection(12);
  const onClose = vi.fn();
  const modal = (opened: boolean) => (
    <AdminModal opened={opened} title="상품 소개 편집" onClose={onClose}>
      <MenuBar editor={editor} />
    </AdminModal>
  );
  const view = render(modal(true));
  updateUrl(openLink(), nextUrl);
  view.rerender(modal(false));
  view.rerender(modal(true));
  expect(screen.queryByRole('dialog', { name: '본문 링크 편집' })).toBeNull();
  expect(editor.view.dom.querySelector('a')?.getAttribute('href')).toBe(firstUrl);
  expect(openLink().getByDisplayValue(firstUrl)).toBeTruthy();
});

it('accepts a complete URL on browsers with the URL constructor but no canParse method', () => {
  const { editor } = setup('<p>설치 가이드</p>', { from: 1, to: 7 });
  vi.stubGlobal(
    'URL',
    new Proxy(URL, {
      get: (target, property, receiver) =>
        property === 'canParse' ? undefined : Reflect.get(target, property, receiver),
    })
  );
  const dialog = openLink();
  updateUrl(dialog, firstUrl);
  fireEvent.click(dialog.getByRole('button', { name: '링크 적용' }));
  expect(editor.view.dom.querySelector('a')?.getAttribute('href')).toBe(firstUrl);
});

it('replaces the label in a quote without replacing the surrounding text', () => {
  const { editor } = setup(`<blockquote><p>앞 <a href="${firstUrl}"><em>기존</em></a> 뒤</p></blockquote>`, 5);
  const dialog = openLink();
  fireEvent.change(dialog.getByLabelText('표시 문구'), {
    target: { value: '새 사용 안내' },
  });
  fireEvent.click(dialog.getByRole('button', { name: '링크 적용' }));
  const quote = editor.view.dom.querySelector('blockquote');
  expect(quote?.textContent).toBe('앞 새 사용 안내 뒤');
  expect(quote?.querySelector('em')?.textContent).toBe('새 사용 안내');
  expect(quote?.querySelector('a')?.getAttribute('href')).toBe(firstUrl);
});

it('preserves legacy link addresses and declines to apply to replaced content', () => {
  const { editor, onUpdate } = setup('<p><a href="mailto:help@example.com">문의</a></p>', 2);
  const dialog = openLink();
  expect(dialog.getByDisplayValue('mailto:help@example.com')).toBeTruthy();
  act(() => editor.commands.setContent('<p>새 본문</p>', false));
  updateUrl(dialog, firstUrl);
  fireEvent.click(dialog.getByRole('button', { name: '링크 적용' }));
  expect(dialog.getByRole('alert').textContent).toContain('본문이 변경되었습니다');
  expect(editor.getHTML()).toBe('<p>새 본문</p>');
  expect(onUpdate).not.toHaveBeenCalled();
});

it('disables link editing while the editor is read-only', () => {
  const { editor, onUpdate } = setup('<p>읽기 전용</p>', 4, true);
  const button = screen.getByRole<HTMLButtonElement>('button', {
    name: '본문 링크 편집',
  });
  expect(button.disabled).toBe(true);
  fireEvent.click(button);
  fireEvent.keyDown(editor.view.dom, { key: 'k', metaKey: true });
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(onUpdate).not.toHaveBeenCalled();
});

it('disables link editing when an inline code selection cannot hold a link mark', () => {
  const { editor } = setup('<p>Run <code>pnpm test</code> now.</p>', { from: 5, to: 14 });
  expect(screen.getByRole<HTMLButtonElement>('button', { name: '본문 링크 편집' }).disabled).toBe(true);
  expect(editor.getHTML()).toBe('<p>Run <code>pnpm test</code> now.</p>');
});

it('disables link editing when an incompatible soft break would split the anchor', () => {
  const { editor } = setup('<p>A<code><br></code>B</p>', { from: 1, to: 4 });
  expect(screen.getByRole<HTMLButtonElement>('button', { name: '본문 링크 편집' }).disabled).toBe(true);
  expect(editor.getHTML()).toBe('<p>A<code><br></code>B</p>');
});

it('allows insertion when the caret has explicitly disabled the surrounding inline code mark', () => {
  const { editor } = setup('<p><code>기존 코드</code></p>', 3);
  const button = screen.getByRole<HTMLButtonElement>('button', { name: '본문 링크 편집' });
  expect(button.disabled).toBe(true);
  act(() => editor.commands.toggleCode());
  expect(button.disabled).toBe(false);
  const dialog = openLink();
  fireEvent.change(dialog.getByLabelText('표시 문구'), { target: { value: '설치 가이드' } });
  updateUrl(dialog, firstUrl);
  fireEvent.click(dialog.getByRole('button', { name: '링크 적용' }));
  expect(editor.view.dom.querySelector('a')?.textContent).toBe('설치 가이드');
  expect(editor.view.dom.querySelector('a')?.closest('code')).toBeNull();
});
