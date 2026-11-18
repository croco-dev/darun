import { notifications } from '@mantine/notifications';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Editor as TiptapEditor } from '@tiptap/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Editor } from '../Editor/Editor';
import { createAdminEditorExtensions } from '../Editor/extensions';
import { MenuBar } from '../Editor/MenuBar';

const { upload } = vi.hoisted(() => ({ upload: vi.fn() }));
vi.mock('@darun/utils-image-upload', () => ({
  useImageUpload: () => ({ upload }),
}));
vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

const file = new File(['image'], 'screen.png', { type: 'image/png' });

describe('편집기 이미지 업로드 수명', () => {
  it('중복 선택을 막고 이미지가 onChange에 반영된 뒤 업로드 완료를 알린다', async () => {
    let complete!: (url: string) => void;
    upload.mockReturnValueOnce(new Promise<string>(resolve => (complete = resolve)));
    let content = '<p>기존 본문</p>';
    const states: { uploading: boolean; content: string }[] = [];
    const view = render(
      <Editor
        value={content}
        onChange={html => (content = html)}
        onImageUploadingChange={uploading => states.push({ uploading, content })}
      />
    );
    const input = await screen.findByLabelText('본문 이미지 업로드');
    const linkButton = screen.getByRole<HTMLButtonElement>('button', { name: '본문 링크 편집' });
    expect(linkButton.disabled).toBe(false);
    act(() => {
      fireEvent.change(input, { target: { files: [file] } });
    });
    expect(upload).not.toHaveBeenCalled();
    const alt = '가격 "비교" & 안내';
    fireEvent.change(screen.getByRole('textbox', { name: '대체 텍스트' }), {
      target: { value: alt },
    });
    const insert = screen.getByRole('button', { name: '이미지 삽입' });
    fireEvent.click(insert);
    fireEvent.click(insert);
    expect(upload).toHaveBeenCalledTimes(1);
    expect(states).toEqual([{ uploading: true, content: '<p>기존 본문</p>' }]);
    expect(linkButton.disabled).toBe(true);
    fireEvent.keyDown(view.container.querySelector('.ProseMirror')!, { key: 'k', ctrlKey: true });
    expect(screen.queryByRole('dialog', { name: '본문 링크 편집' })).toBeNull();
    await act(async () => complete('https://example.com/inserted.png'));
    expect(states).toHaveLength(2);
    expect(states[1].uploading).toBe(false);
    const saved = new DOMParser().parseFromString(states[1].content, 'text/html');
    expect(saved.querySelector('img')?.getAttribute('src')).toBe('https://example.com/inserted.png');
    expect(saved.querySelector('img')?.getAttribute('alt')).toBe(alt);
    expect((input as HTMLInputElement).value).toBe('');
  });

  it('숫자로 된 기존 설명을 문자열로 읽고 URL·제목·주변 본문을 보존한다', () => {
    const first = 'https://example.com/first.png';
    const second = '0042';
    const editor = new TiptapEditor({
      content: `<p>앞 문장</p><img src="${first}"><img src="${second}" alt="007" title="008"><p>뒤 문장</p>`,
      extensions: createAdminEditorExtensions(),
    });
    const selectImage = () => {
      editor.state.doc.forEach((_node, position, index) => {
        if (index === 2) editor.commands.setNodeSelection(position);
      });
    };
    const view = render(<MenuBar editor={editor} />);
    act(selectImage);
    fireEvent.click(screen.getByRole('button', { name: '이미지 대체 텍스트 수정' }));
    expect((screen.getByRole('textbox', { name: '대체 텍스트' }) as HTMLInputElement).value).toBe('007');
    fireEvent.click(screen.getByRole('checkbox', { name: '장식용 이미지' }));
    fireEvent.click(screen.getByRole('button', { name: '대체 텍스트 적용' }));

    const html = editor.getHTML();
    const content = new DOMParser().parseFromString(html, 'text/html');
    const [untouched, edited] = content.querySelectorAll('img');
    expect(untouched.getAttribute('src')).toBe(first);
    expect(untouched.getAttribute('alt')).toBeNull();
    expect(edited.getAttribute('src')).toBe(second);
    expect(edited.getAttribute('alt')).toBe('');
    expect(edited.getAttribute('title')).toBe('008');
    expect(content.body.textContent).toBe('앞 문장뒤 문장');
    expect(upload).not.toHaveBeenCalled();

    view.unmount();
    editor.commands.setContent(html);
    render(<MenuBar editor={editor} />);
    act(selectImage);
    fireEvent.click(screen.getByRole('button', { name: '이미지 대체 텍스트 수정' }));
    expect(
      (
        screen.getByRole('checkbox', {
          name: '장식용 이미지',
        }) as HTMLInputElement
      ).checked
    ).toBe(true);
    editor.destroy();
  });

  it('표 셀에서 선택한 이미지의 대체 텍스트 버튼으로 Shift+Tab으로 이동한다', () => {
    const editor = new TiptapEditor({
      content:
        '<table><tbody><tr><td><p>첫 셀</p></td><td><img src="https://example.com/second.png"></td></tr></tbody></table>',
      extensions: createAdminEditorExtensions(),
    });
    const view = render(<MenuBar editor={editor} />);
    try {
      act(() => {
        editor.state.doc.descendants((node, position) => {
          if (node.type.name === 'image') editor.commands.setNodeSelection(position);
        });
      });
      const edit = screen.getByRole('button', { name: '이미지 대체 텍스트 수정' });
      fireEvent.keyDown(editor.view.dom, { key: 'Tab', shiftKey: true });

      expect(document.activeElement).toBe(edit);
      fireEvent.click(edit);
      expect(screen.getByRole('textbox', { name: '대체 텍스트' })).toBeTruthy();
    } finally {
      view.unmount();
      editor.destroy();
    }
  });

  it('본문이 바뀌면 이전에 선택한 이미지 위치에 대체 텍스트를 적용하지 않는다', () => {
    const editor = new TiptapEditor({
      content: '<p>이전 본문</p><img src="https://example.com/first.png" alt="기존 설명">',
      extensions: createAdminEditorExtensions(),
    });
    const view = render(<MenuBar editor={editor} />);
    try {
      act(() => {
        editor.state.doc.forEach((node, position) => {
          if (node.type.name === 'image') editor.commands.setNodeSelection(position);
        });
      });
      fireEvent.click(screen.getByRole('button', { name: '이미지 대체 텍스트 수정' }));
      fireEvent.change(screen.getByRole('textbox', { name: '대체 텍스트' }), {
        target: { value: '이전 이미지에 쓴 설명' },
      });
      act(() => {
        editor.commands.setContent('<p>새 본문</p>');
      });
      fireEvent.click(screen.getByRole('button', { name: '대체 텍스트 적용' }));

      expect(editor.getHTML()).toBe('<p>새 본문</p>');
      expect(notifications.show).toHaveBeenCalledWith(expect.objectContaining({ color: 'red' }));
    } finally {
      view.unmount();
      editor.destroy();
    }
  });

  it.each(['success', 'failure'] as const)('편집기 종료 뒤 %s 응답은 본문과 알림을 변경하지 않는다', async outcome => {
    let complete!: (url: string) => void;
    let fail!: (error: Error) => void;
    upload.mockReturnValueOnce(
      new Promise<string>((resolve, reject) => {
        complete = resolve;
        fail = reject;
      })
    );
    const change = vi.fn();
    const uploading = vi.fn();
    const view = render(<Editor value="<p>남길 본문</p>" onChange={change} onImageUploadingChange={uploading} />);
    fireEvent.change(await screen.findByLabelText('본문 이미지 업로드'), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: '장식용 이미지' }));
    fireEvent.click(screen.getByRole('button', { name: '이미지 삽입' }));
    expect(uploading).toHaveBeenLastCalledWith(true);
    const signal = upload.mock.calls[0][3] as AbortSignal;
    expect(signal.aborted).toBe(false);
    view.unmount();
    expect(signal.aborted).toBe(true);
    expect(uploading.mock.calls).toEqual([[true], [false]]);
    await act(async () => {
      if (outcome === 'success') complete('https://example.com/stale.png');
      else fail(new Error('Late failure'));
    });
    expect(change).not.toHaveBeenCalled();
    expect(notifications.show).not.toHaveBeenCalled();
    expect(uploading.mock.calls).toEqual([[true], [false]]);
  });
});
