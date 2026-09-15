import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { AdminField } from '../AdminField';
import { AdminModal } from '../AdminModal';

describe('AdminField and AdminModal', () => {
  afterEach(() => {
    cleanup();
  });

  describe('AdminField', () => {
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
  });
});
