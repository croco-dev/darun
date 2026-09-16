// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import ErrorPage from '../app/error';
import NotFoundPage from '../app/not-found';

describe('Error and NotFound Pages', () => {
  afterEach(() => {
    cleanup();
  });

  describe('ErrorPage', () => {
    it('renders error title, retry button, and dashboard escape link', () => {
      const reset = vi.fn();
      const testError = new Error('Test error message');

      render(<ErrorPage error={testError} reset={reset} />);

      expect(screen.getByText('문제가 발생했습니다.')).toBeDefined();

      const retryBtn = screen.getByRole('button', { name: '다시 시도' });
      expect(retryBtn).toBeDefined();
      fireEvent.click(retryBtn);
      expect(reset).toHaveBeenCalledTimes(1);

      const dashboardLink = screen.getByRole('link', { name: '대시보드로 이동' });
      expect(dashboardLink).toBeDefined();
      expect(dashboardLink.getAttribute('href')).toBe('/');
    });
  });

  describe('NotFoundPage', () => {
    it('renders 404 title, message, and return to dashboard button', () => {
      render(<NotFoundPage />);

      expect(screen.getByText('페이지를 찾을 수 없습니다.')).toBeDefined();
      expect(screen.getByText('주소를 다시 확인하거나 대시보드로 돌아가 주세요.')).toBeDefined();

      const dashboardBtn = screen.getByRole('link', { name: '대시보드로 돌아가기' });
      expect(dashboardBtn).toBeDefined();
      expect(dashboardBtn.getAttribute('href')).toBe('/');
    });
  });
});
