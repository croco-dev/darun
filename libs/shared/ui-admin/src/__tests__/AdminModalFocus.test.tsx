import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminModal } from '../AdminModal';

describe('AdminModal focus lifecycle', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.style.overflow = '';
  });

  it('목록 갱신에도 내부 초점을 유지하고 최신 닫기 동작과 Tab 순환을 사용한다', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    function PollingList() {
      const [opened, setOpened] = useState(false);
      const [revision, setRevision] = useState(0);
      useEffect(() => {
        const timer = setInterval(() => setRevision(value => value + 1), 3000);
        return () => clearInterval(timer);
      }, []);
      return (
        <>
          <button type="button" onClick={() => setOpened(true)}>
            오류 상세
          </button>
          <output aria-label="목록 갱신 횟수">{revision}</output>
          <AdminModal
            opened={opened}
            onClose={() => {
              onClose(revision);
              setOpened(false);
            }}
            title="오류 상세"
          >
            <input aria-label="오류 메모" />
            <button type="button">에러 복사</button>
          </AdminModal>
        </>
      );
    }
    document.body.style.overflow = 'scroll';
    render(<PollingList />);
    const opener = screen.getByRole('button', { name: '오류 상세' });
    opener.focus();
    fireEvent.click(opener);
    act(() => vi.advanceTimersByTime(0));
    const close = screen.getByRole('button', { name: '닫기' });
    const copy = screen.getByRole('button', { name: '에러 복사' });
    const note = screen.getByRole('textbox', { name: '오류 메모' });
    expect(document.activeElement).toBe(close);
    note.focus();
    const initialFocus = vi.spyOn(close, 'focus');
    const restoreFocus = vi.spyOn(opener, 'focus');
    const overflowChanges = vi.spyOn(document.body.style, 'overflow', 'set');

    for (let revision = 1; revision <= 2; revision++) {
      act(() => vi.advanceTimersByTime(3000));
      act(() => vi.advanceTimersByTime(0));
      expect(screen.getByLabelText('목록 갱신 횟수').textContent).toBe(String(revision));
      expect(document.activeElement).toBe(note);
      expect(document.body.style.overflow).toBe('hidden');
    }
    expect(initialFocus).not.toHaveBeenCalled();
    expect(restoreFocus).not.toHaveBeenCalled();
    expect(overflowChanges).not.toHaveBeenCalled();

    copy.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(copy);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose.mock.calls).toEqual([[2]]);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(restoreFocus).toHaveBeenCalledTimes(1);
    expect(document.body.style.overflow).toBe('scroll');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('다시 열 때 새 opener를 기록하고 unmount 시 초점과 스크롤을 복구한다', () => {
    vi.useFakeTimers();
    render(
      <>
        <button type="button">첫 opener</button>
        <button type="button">둘째 opener</button>
      </>
    );
    const content = (opened: boolean) => (
      <AdminModal opened={opened} onClose={vi.fn()}>
        <input aria-label="초안" />
      </AdminModal>
    );
    const { rerender, unmount } = render(content(false));
    const first = screen.getByRole('button', { name: '첫 opener' });
    const second = screen.getByRole('button', { name: '둘째 opener' });
    first.focus();
    rerender(content(true));
    act(() => vi.advanceTimersByTime(0));
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '닫기' }));
    rerender(content(false));
    expect(document.activeElement).toBe(first);
    second.focus();
    rerender(content(true));
    act(() => vi.advanceTimersByTime(0));
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '닫기' }));
    unmount();
    expect(document.activeElement).toBe(second);
    expect(document.body.style.overflow).toBe('');
  });
});
