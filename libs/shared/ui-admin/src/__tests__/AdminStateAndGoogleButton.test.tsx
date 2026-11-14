import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminEmptyState, AdminErrorState } from '../AdminState';
import { GoogleButton } from '../GoogleButton';

describe('AdminEmptyState and GoogleButton', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  describe('AdminErrorState', () => {
    it.each(['denied', 'unsupported'] as const)(
      'shows copy failure (%s) and can retry the same details',
      async failure => {
        const details = 'code: CONNECTION_FAILED\nrequestId: test-123';
        const writeText = vi.fn().mockResolvedValue(undefined);
        if (failure === 'denied') writeText.mockRejectedValueOnce(new DOMException('Denied', 'NotAllowedError'));
        const clipboard = { writeText };
        vi.stubGlobal('navigator', {
          clipboard: failure === 'denied' ? clipboard : {},
        });

        render(<AdminErrorState details={details} />);
        fireEvent.click(screen.getByText('자세한 오류 정보 확인'));
        const button = screen.getByRole('button', { name: '오류 내용 복사' });
        await act(async () => {
          fireEvent.click(button);
        });

        expect(screen.queryByRole('status')?.textContent).toContain('아래 오류 텍스트를 선택해 직접 복사');
        expect(button.textContent).toBe('오류 내용 복사');
        expect(button.closest('details')?.querySelector('pre')?.textContent).toBe(details);

        if (failure === 'unsupported') {
          const status = screen.getByRole('status');
          const previousMessage = status.firstChild;
          await act(async () => {
            fireEvent.click(button);
          });
          expect(status.textContent).toContain('아래 오류 텍스트를 선택해 직접 복사');
          expect(status.firstChild).not.toBe(previousMessage);
        }

        vi.stubGlobal('navigator', { clipboard });
        await act(async () => {
          fireEvent.click(button);
        });

        expect(writeText).toHaveBeenLastCalledWith(details);
        expect(screen.getByRole('status').textContent).toBe('');
        expect(button.textContent).toBe('복사 완료!');
      }
    );

    it('copies newly displayed details while an older write finishes without changing their feedback', async () => {
      const olderWrite = Promise.withResolvers<void>();
      const writeText = vi.fn().mockResolvedValue(undefined).mockReturnValueOnce(olderWrite.promise);
      vi.stubGlobal('navigator', { clipboard: { writeText } });
      const { rerender } = render(<AdminErrorState details="첫 번째 오류" />);
      fireEvent.click(screen.getByText('자세한 오류 정보 확인'));
      const button = screen.getByRole('button', { name: '오류 내용 복사' });
      fireEvent.click(button);

      rerender(<AdminErrorState details="두 번째 오류" />);
      await act(async () => {
        fireEvent.click(button);
      });
      expect(writeText.mock.calls).toEqual([['첫 번째 오류'], ['두 번째 오류']]);
      expect(button.textContent).toBe('복사 완료!');

      await act(async () => olderWrite.reject(new Error('Older write rejected')));
      expect(button.textContent).toBe('복사 완료!');
      expect(screen.getByRole('status').textContent).toBe('');
    });
  });

  describe('AdminEmptyState', () => {
    it('renders title and description', () => {
      render(<AdminEmptyState title="항목이 없습니다." description="새 항목을 추가하세요." />);

      expect(screen.getByText('항목이 없습니다.')).toBeDefined();
      expect(screen.getByText('새 항목을 추가하세요.')).toBeDefined();
    });

    it('renders action element when action prop is provided', () => {
      render(<AdminEmptyState title="데이터 없음" action={<button type="button">데이터 추가</button>} />);

      expect(screen.getByRole('button', { name: '데이터 추가' })).toBeDefined();
    });
  });

  describe('GoogleButton', () => {
    it('renders Google icon and child label in idle state', () => {
      render(<GoogleButton>Google로 로그인</GoogleButton>);

      expect(screen.getByText('Google로 로그인')).toBeDefined();
      const button = screen.getByRole('button', { name: /Google로 로그인/ });
      expect(button.getAttribute('aria-busy')).toBeNull();
      expect(button.hasAttribute('disabled')).toBe(false);
    });

    it('renders loading spinner and loading text when loading is true', () => {
      render(<GoogleButton loading>Google로 로그인</GoogleButton>);

      expect(screen.getByText('로그인 처리 중...')).toBeDefined();
      expect(screen.queryByText('Google로 로그인')).toBeNull();
      const button = screen.getByRole('button', { name: /로그인 처리 중/ });
      expect(button.getAttribute('aria-busy')).toBe('true');
      expect(button.hasAttribute('disabled')).toBe(true);
    });
  });
});
