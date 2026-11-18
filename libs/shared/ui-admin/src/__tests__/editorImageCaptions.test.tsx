import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Editor } from '@tiptap/react';
import { afterEach, expect, it, vi } from 'vitest';
import { AdminModal } from '../AdminModal';
import { createAdminEditorExtensions } from '../Editor/extensions';
import { MenuBar } from '../Editor/MenuBar';

const { upload } = vi.hoisted(() => ({ upload: vi.fn() }));
vi.mock('@darun/utils-image-upload', () => ({
  useImageUpload: () => ({ upload }),
}));
vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));

afterEach(cleanup);

it('캡션과 출처를 각 이미지에 저장하고 재열기·이동·제거해도 원래 이미지와 대체 텍스트를 보존한다', () => {
  const editor = new Editor({
    extensions: createAdminEditorExtensions(),
    content:
      '<p>앞 문장</p><img src="/first.png" alt="첫 화면"><img src="/second.png" alt="둘째 화면" title="007"><img src="/legacy.png"><p>뒤 문장</p>',
  });
  const view = render(<MenuBar editor={editor} />);
  const open = (src: string) => {
    act(() => {
      editor.state.doc.forEach((node, pos) => {
        if (node.attrs.src === src) editor.commands.setNodeSelection(pos);
      });
    });
    fireEvent.click(screen.getByText('이미지 캡션·출처 편집', { selector: 'button' }));
  };
  const set = (label: string, value: string) => {
    fireEvent.change(screen.getByLabelText(label), {
      target: { value },
    });
  };
  const apply = () => fireEvent.click(screen.getByText('캡션·출처 적용', { selector: 'button' }));
  const saved = () => new DOMParser().parseFromString(editor.getHTML(), 'text/html');

  try {
    open('/first.png');
    expect(document.activeElement).toBe(screen.getByLabelText('캡션'));
    set('캡션', '<b>검색 결과</b> 비교');
    set('출처 이름', '사용 설명서');
    set('출처 주소', 'https://example.com/docs?a=1&b=2');
    apply();
    open('/second.png');
    set('출처 이름', '서비스 도움말');
    set('출처 주소', 'javascript:alert(1)');
    const beforeInvalid = editor.getHTML();
    apply();
    expect(screen.getByLabelText('출처 주소').getAttribute('aria-invalid')).toBe('true');
    expect(editor.getHTML()).toBe(beforeInvalid);
    set('출처 주소', '');
    apply();

    const html = editor.getHTML();
    act(() => editor.commands.setContent(html));
    open('/first.png');
    expect(screen.getByLabelText<HTMLInputElement>('출처 이름').value).toBe('사용 설명서');
    expect(screen.getByLabelText<HTMLInputElement>('출처 주소').value).toBe('https://example.com/docs?a=1&b=2');
    fireEvent.keyDown(screen.getByLabelText('출처 주소'), {
      key: 'Escape',
    });
    const selected = editor.state.selection;
    const firstImage = editor.state.doc.nodeAt(selected.from)!;
    // Move the entire selected node after the other captioned image, as an editor drag does.
    act(() => {
      const tr = editor.state.tr.delete(selected.from, selected.to).insert(selected.from + 1, firstImage);
      editor.view.dispatch(tr);
    });
    const [second, first] = saved().querySelectorAll('figure');
    expect(second.querySelector('img')?.getAttribute('src')).toBe('/second.png');
    expect(second.querySelector('figcaption')?.textContent).toBe('서비스 도움말');
    expect(first.querySelector('img')?.getAttribute('src')).toBe('/first.png');
    expect(first.querySelector('figcaption')?.textContent).toContain('<b>검색 결과</b> 비교');
    expect(first.querySelector('figcaption b')).toBeNull();
    expect(first.querySelector('figcaption a')?.getAttribute('href')).toBe('https://example.com/docs?a=1&b=2');

    open('/second.png');
    set('출처 이름', '');
    apply();
    const doc = saved();
    expect(doc.querySelector('body > img[src="/second.png"]')?.getAttribute('alt')).toBe('둘째 화면');
    expect(doc.querySelector('body > img[src="/second.png"]')?.getAttribute('title')).toBe('007');
    expect(doc.querySelector('body > img[src="/legacy.png"]')?.getAttribute('alt')).toBeNull();
    expect([...doc.querySelectorAll('p')].map(p => p.textContent)).toEqual(['앞 문장', '뒤 문장']);

    open('/second.png');
    set('출처 주소', 'HTTPS://example.com/자료');
    apply();
    const creditLink = saved().querySelector('figure img[src="/second.png"] + figcaption a');
    expect(creditLink?.textContent).toBe('이미지 출처');
    expect(creditLink?.getAttribute('href')).toBe('HTTPS://example.com/자료');
    act(() => editor.commands.setContent(editor.getHTML()));
    open('/second.png');
    expect(screen.getByLabelText<HTMLInputElement>('출처 이름').value).toBe('');
    expect(screen.getByLabelText<HTMLInputElement>('출처 주소').value).toBe('HTTPS://example.com/자료');
    expect(upload).not.toHaveBeenCalled();
  } finally {
    view.unmount();
    editor.destroy();
  }
});

it.each([
  '<img src="/first.png"><img src="/second.png"><figcaption><span>두 화면 비교</span></figcaption>',
  '<img src="/first.png"><figcaption><span>두 화면 비교<img src="/second.png"></span></figcaption>',
  '<img src="/first.png">두 화면 비교<figcaption><small><a href="https://example.com/"><img src="/second.png"></a></small></figcaption>',
  '<img src="/first.png"><figcaption>두 화면 비교<p><img src="/second.png"></p></figcaption>',
])('표준 작성 형식과 다른 figure를 붙여 넣어도 이미지와 설명을 보존한다 (%s)', contents => {
  const editor = new Editor({
    extensions: createAdminEditorExtensions(),
  });
  try {
    editor.view.pasteHTML(`<figure data-editor-image="">${contents}</figure>`, new Event('paste') as ClipboardEvent);
    const doc = new DOMParser().parseFromString(editor.getHTML(), 'text/html');
    expect([...doc.querySelectorAll('img')].map(img => img.getAttribute('src'))).toEqual(['/first.png', '/second.png']);
    expect(doc.querySelector('figure')).toBeNull();
    expect(doc.body.textContent).toBe('두 화면 비교');
  } finally {
    editor.destroy();
  }
});

it('설명 수정 창을 닫으면 적용하지 않은 캡션 입력을 비우고 저장된 캡션으로 다시 편집한다', () => {
  const content =
    '<figure data-editor-image=""><img src="/first.png"><figcaption><span>저장된 캡션</span></figcaption></figure>';
  const editor = new Editor({ extensions: createAdminEditorExtensions(), content });
  const modal = (opened: boolean) => (
    <AdminModal opened={opened} onClose={() => {}} title="설명 수정">
      <MenuBar editor={editor} />
    </AdminModal>
  );
  const view = render(modal(true));
  const edit = screen.getByText('이미지 캡션·출처 편집', { selector: 'button' });
  try {
    act(() => editor.commands.setNodeSelection(0));
    fireEvent.click(edit);
    const field = screen.getByLabelText<HTMLInputElement>('캡션');
    expect(field.value).toBe('저장된 캡션');
    fireEvent.change(field, { target: { value: '적용하지 않은 입력' } });
    view.rerender(modal(false));
    view.rerender(modal(true));
    expect(screen.queryByLabelText('캡션')).toBeNull();
    fireEvent.click(edit);
    expect(screen.getByLabelText<HTMLInputElement>('캡션').value).toBe('저장된 캡션');
  } finally {
    view.unmount();
    editor.destroy();
  }
});
