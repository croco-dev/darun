import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Editor as CoreEditor } from '@tiptap/core';
import { tableEditingKey } from '@tiptap/pm/tables';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Editor } from '../Editor/Editor';

vi.mock('@darun/utils-image-upload', () => ({
  useImageUpload: () => ({ upload: vi.fn() }),
}));
afterEach(cleanup);
const oversized = '<table><tr><td colspan="600">A</td><td colspan="401">B</td></tr></table>';

describe('큰 표 거절과 원문 보존', () => {
  it.each([
    '<table><tr><td colspan="1000">가격</td></tr></table>',
    `<p data-pm-slice='1 1 ["table",null,"tableRow",null,"tableCell",{"colspan":999999999,"rowspan":1}]'>가격</p>`,
  ])('셀 안 붙여넣기는 native 격자 확장 전에 도착 표와 slice 속성을 검사한다', async incoming => {
    const change = vi.fn();
    const source = '<table>' + '<tr><td>초안</td></tr>'.repeat(101) + '</table>';
    const view = render(<Editor value={source} onChange={change} />);
    await waitFor(() => expect(view.container.querySelector('.ProseMirror')).not.toBeNull());
    const element = view.container.querySelector('.ProseMirror') as HTMLElement & { editor: CoreEditor };
    const core = element.editor;
    core.commands.setTextSelection(4);
    const nativePlugin = core.state.plugins.find(plugin => plugin.spec.key === tableEditingKey)!;
    const nativePaste = vi.spyOn(nativePlugin.props, 'handlePaste').mockImplementation(() => true);
    const before = core.getHTML();
    try {
      fireEvent.paste(element, {
        clipboardData: {
          getData: (type: string) => (type === 'text/html' ? incoming : ''),
        },
      });
      expect(nativePaste).not.toHaveBeenCalled();
      expect(screen.getByRole('alert').textContent).toContain('표');
      expect(core.getHTML()).toBe(before);
      expect(change).not.toHaveBeenCalled();
    } finally {
      nativePaste.mockRestore();
    }
  });

  it('서버의 로딩 화면에서 오류 안내로 hydration 오류 없이 전환한다', async () => {
    const parser = globalThis.DOMParser;
    let html: string;
    try {
      vi.stubGlobal('DOMParser', undefined);
      html = renderToString(<Editor value={oversized} />);
    } finally {
      vi.stubGlobal('DOMParser', parser);
    }
    const container = document.createElement('div');
    container.innerHTML = html;
    document.body.appendChild(container);
    const recoverableError = vi.fn();
    render(<Editor value={oversized} />, {
      container,
      hydrate: true,
      onRecoverableError: recoverableError,
    });
    expect((await screen.findByRole('alert')).textContent).toContain('표');
    expect(recoverableError).not.toHaveBeenCalled();
  });

  it('최초 내용과 후속 값 변경을 파싱 전에 거절하고 정상 값으로 복구한다', async () => {
    const change = vi.fn();
    const view = render(<Editor value={oversized} onChange={change} />);
    expect((await screen.findByRole('alert')).textContent).toContain('표');
    expect(view.container.querySelector('.ProseMirror')).toBeNull();
    expect(change).not.toHaveBeenCalled();
    view.rerender(<Editor value="<p>정상 초안</p>" onChange={change} />);
    await waitFor(() => expect(view.container.querySelector('.ProseMirror')?.textContent).toBe('정상 초안'));
    expect(screen.queryByRole('alert')).toBeNull();
    view.rerender(<Editor value={oversized} onChange={change} />);
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(change).not.toHaveBeenCalled();
  });

  it.each(['paste', 'drop'] as const)('%s는 기존 초안을 바꾸지 않고 거절 이유를 표시한다', async event => {
    const change = vi.fn();
    const view = render(<Editor value="<p>기존 초안</p>" onChange={change} />);
    await waitFor(() => expect(view.container.querySelector('.ProseMirror')).not.toBeNull());
    const editor = view.container.querySelector('.ProseMirror')!;
    const data = { getData: () => oversized };
    if (event === 'paste') fireEvent.paste(editor, { clipboardData: data });
    else fireEvent.drop(editor, { dataTransfer: data });
    expect(screen.getByRole('alert').textContent).toContain('표');
    expect(editor.textContent).toBe('기존 초안');
    expect(change).not.toHaveBeenCalled();
    view.rerender(<Editor value="<p>다른 문서</p>" onChange={change} />);
    await waitFor(() => expect(editor.textContent).toBe('다른 문서'));
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
