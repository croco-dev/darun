import { notifications } from '@mantine/notifications';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Editor } from '../Editor/Editor';

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
    render(
      <Editor
        value={content}
        onChange={html => (content = html)}
        onImageUploadingChange={uploading => states.push({ uploading, content })}
      />
    );
    const input = await screen.findByLabelText('본문 이미지 업로드');
    act(() => {
      fireEvent.change(input, { target: { files: [file] } });
      fireEvent.change(input, { target: { files: [file] } });
    });
    expect(upload).toHaveBeenCalledTimes(1);
    expect(states).toEqual([{ uploading: true, content: '<p>기존 본문</p>' }]);
    await act(async () => complete('https://example.com/inserted.png'));
    expect(states).toHaveLength(2);
    expect(states[1].uploading).toBe(false);
    expect(states[1].content).toContain('https://example.com/inserted.png');
    expect((input as HTMLInputElement).value).toBe('');
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
    expect(uploading).toHaveBeenLastCalledWith(true);
    view.unmount();
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
