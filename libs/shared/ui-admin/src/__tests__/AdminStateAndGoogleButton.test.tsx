import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { AdminEmptyState } from '../AdminState';
import { GoogleButton } from '../GoogleButton';

describe('AdminEmptyState and GoogleButton', () => {
  afterEach(() => {
    cleanup();
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
