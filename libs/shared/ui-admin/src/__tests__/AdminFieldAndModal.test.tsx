import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { useState } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { AdminField } from '../AdminField';
import { AdminInput } from '../AdminInput';
import { AdminModal } from '../AdminModal';

describe('AdminField and AdminModal', () => {
  afterEach(() => {
    cleanup();
  });

  describe('AdminField', () => {
    it('connects a nested file control, not its wrapper, including existing IDs', () => {
      render(
        <AdminField label="로고" help="이미지 선택" error="필수입니다">
          <div data-testid="wrapper">
            <AdminInput id="logo-file" type="file" aria-describedby="existing-help" />
          </div>
        </AdminField>
      );
      const input = screen.getByLabelText('로고');
      expect(input.tagName).toBe('INPUT');
      expect(input.id).toBe('logo-file');
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(input.getAttribute('aria-describedby')).toBe('existing-help logo-file-help logo-file-error');
      expect(screen.getByTestId('wrapper').id).toBe('');
    });
    it('renders without error when multiple children are passed', () => {
      expect(() => {
        render(
          <AdminField label="다중 자식 테스트">
            <input type="text" data-testid="input-1" />
            <input type="text" data-testid="input-2" />
          </AdminField>
        );
      }).not.toThrow();

      expect(screen.getByTestId('input-1')).not.toBeNull();
      expect(screen.getByTestId('input-2')).not.toBeNull();
    });

    it('renders label and error correctly', () => {
      render(
        <AdminField label="필드 라벨" error="오류 메시지">
          <input type="text" data-testid="single-input" />
        </AdminField>
      );

      expect(screen.getByText('필드 라벨')).not.toBeNull();
      expect(screen.getByText('오류 메시지')).not.toBeNull();
    });
  });

  describe('AdminModal', () => {
    it('preserves an edited draft through dismissal and reopening', () => {
      const content = <input aria-label="초안" defaultValue="original" />;
      const { rerender } = render(
        <AdminModal opened onClose={vi.fn()}>
          {content}
        </AdminModal>
      );
      fireEvent.change(screen.getByLabelText('초안'), { target: { value: 'unsaved draft' } });
      rerender(
        <AdminModal opened={false} onClose={vi.fn()}>
          {content}
        </AdminModal>
      );
      expect(screen.queryByRole('dialog')).toBeNull();
      rerender(
        <AdminModal opened onClose={vi.fn()}>
          {content}
        </AdminModal>
      );
      expect((screen.getByLabelText('초안') as HTMLInputElement).value).toBe('unsaved draft');
    });

    it('keeps draft and failure state when a delayed save fails after closing', async () => {
      const { promise: save, reject: rejectSave } = Promise.withResolvers<void>();
      function Draft() {
        const [value, setValue] = useState('original');
        const [error, setError] = useState('');
        return (
          <form
            onSubmit={event => {
              event.preventDefault();
              void save.catch(reason => setError(reason.message));
            }}
          >
            <input aria-label="저장할 초안" value={value} onChange={event => setValue(event.target.value)} />
            <button type="submit">저장</button>
            {error && <p role="alert">{error}</p>}
          </form>
        );
      }
      const { rerender } = render(
        <AdminModal opened onClose={vi.fn()}>
          <Draft />
        </AdminModal>
      );
      fireEvent.change(screen.getByLabelText('저장할 초안'), { target: { value: 'edited' } });
      fireEvent.click(screen.getByText('저장'));
      rerender(
        <AdminModal opened={false} onClose={vi.fn()}>
          <Draft />
        </AdminModal>
      );
      await act(async () => {
        rejectSave(new Error('Save failed'));
      });
      rerender(
        <AdminModal opened onClose={vi.fn()}>
          <Draft />
        </AdminModal>
      );
      expect((screen.getByLabelText('저장할 초안') as HTMLInputElement).value).toBe('edited');
      expect(screen.getByRole('alert').textContent).toBe('Save failed');
    });
    it('does not render content when opened is false', () => {
      render(
        <AdminModal opened={false} onClose={vi.fn()} title="모달 제목">
          <p>모달 내용</p>
        </AdminModal>
      );

      expect(screen.queryByText('모달 제목')).toBeNull();
    });

    it('renders title and children when opened is true', () => {
      render(
        <AdminModal opened={true} onClose={vi.fn()} title="모달 제목">
          <p>모달 내용</p>
        </AdminModal>
      );

      expect(screen.getByText('모달 제목')).not.toBeNull();
      expect(screen.getByText('모달 내용')).not.toBeNull();
    });

    it('calls onClose when close button is clicked', () => {
      const onClose = vi.fn();
      render(
        <AdminModal opened={true} onClose={onClose} title="모달 제목">
          <p>모달 내용</p>
        </AdminModal>
      );

      const closeButton = screen.getByLabelText('닫기');
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Escape key is pressed', () => {
      const onClose = vi.fn();
      render(
        <AdminModal opened={true} onClose={onClose} title="모달 제목">
          <p>모달 내용</p>
        </AdminModal>
      );

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('traps focus inside the modal on Tab key navigation', () => {
      const onClose = vi.fn();
      render(
        <AdminModal opened={true} onClose={onClose} title="모달 제목">
          <button type="button" data-testid="first-btn">
            첫번째
          </button>
          <button type="button" data-testid="second-btn">
            두번째
          </button>
        </AdminModal>
      );

      const closeButton = screen.getByLabelText('닫기');
      const secondBtn = screen.getByTestId('second-btn');

      // Focus last element and press Tab -> wraps to closeButton (first focusable)
      secondBtn.focus();
      fireEvent.keyDown(document, { key: 'Tab' });
      expect(document.activeElement).toBe(closeButton);

      // Focus first element and press Shift+Tab -> wraps to secondBtn (last focusable)
      closeButton.focus();
      fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
      expect(document.activeElement).toBe(secondBtn);
    });
  });
});
