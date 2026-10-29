import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Editor } from '../Editor/Editor';

vi.mock('@darun/utils-image-upload', () => ({ useImageUpload: () => ({ upload: vi.fn() }) }));
afterEach(cleanup);
const oversized = '<table><tr><td colspan="600">A</td><td colspan="401">B</td></tr></table>';

describe('큰 표 거절과 원문 보존', () => {
  it('최초 내용과 후속 값 변경을 파싱 전에 거절하고 정상 값으로 복구한다', async () => {
    const change = vi.fn();
    const view = render(<Editor value={oversized} onChange={change} />);
    expect(screen.getByRole('alert').textContent).toContain('표');
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
