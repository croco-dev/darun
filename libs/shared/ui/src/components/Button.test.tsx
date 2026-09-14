import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Button } from './Button';

afterEach(() => {
  cleanup();
});

describe('Button', () => {
  it('renders as a button by default with negative controls for loading', () => {
    render(<Button>확인</Button>);

    const button = screen.getByRole('button', { name: '확인' });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
    expect(button).not.toHaveAttribute('aria-busy');
    expect(button).not.toHaveClass('cursor-wait');
    expect(button.querySelector('svg.animate-spin')).not.toBeInTheDocument();
  });

  it('renders as an anchor when href is provided', () => {
    render(
      <Button href="/path" as="a">
        링크
      </Button>
    );

    const link = screen.getByRole('link', { name: '링크' });
    expect(link).toHaveAttribute('href', '/path');
    expect(link).not.toHaveAttribute('aria-disabled');
  });

  it('maps kind to variant and color without explicit variant props', () => {
    const { container } = render(<Button kind="textActive">활성 메뉴</Button>);

    expect(container.querySelector('button')).toHaveClass('bg-dark-100');
  });

  it('preserves the base variant by default', () => {
    const { container } = render(<Button>기본</Button>);

    expect(container.querySelector('button')).toHaveClass('border-dark-900', 'bg-dark-900', 'text-white');
  });

  it('renders spinner, sets cursor-wait, and disables button when loading is true', () => {
    render(<Button loading>제출 중</Button>);

    const button = screen.getByRole('button', { name: '제출 중' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toHaveClass('cursor-wait');
    expect(button.querySelector('svg.animate-spin')).toBeInTheDocument();
  });

  it('suppresses onClick calls when loading is true', () => {
    const handleClick = vi.fn();
    render(<Button loading onClick={handleClick}>클릭 방지</Button>);

    const button = screen.getByRole('button', { name: '클릭 방지' });
    fireEvent.click(button);

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('transitions cleanly between loading states', () => {
    const { rerender } = render(<Button loading={true}>상태 전환</Button>);
    const button = screen.getByRole('button', { name: '상태 전환' });
    expect(button).toBeDisabled();
    expect(button.querySelector('svg.animate-spin')).toBeInTheDocument();

    rerender(<Button loading={false}>상태 전환</Button>);
    expect(button).not.toBeDisabled();
    expect(button.querySelector('svg.animate-spin')).not.toBeInTheDocument();
  });

  it('disables anchor element and suppresses clicks when loading is true', () => {
    const handleClick = vi.fn();
    render(
      <Button as="a" href="/destination" loading onClick={handleClick}>
        링크 버튼
      </Button>
    );

    const link = screen.getByRole('link', { name: '링크 버튼' });
    expect(link).toHaveAttribute('aria-disabled', 'true');
    expect(link).toHaveAttribute('aria-busy', 'true');
    expect(link).toHaveAttribute('tabindex', '-1');

    fireEvent.click(link);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('adjusts spinner size based on button size', () => {
    const { rerender } = render(<Button size="sm" loading>작은 버튼</Button>);
    expect(screen.getByRole('button', { name: '작은 버튼' }).querySelector('svg.animate-spin')).toHaveClass('h-3.5', 'w-3.5');

    rerender(<Button size="lg" loading>큰 버튼</Button>);
    expect(screen.getByRole('button', { name: '큰 버튼' }).querySelector('svg.animate-spin')).toHaveClass('h-5', 'w-5');
  });

  it('remains disabled when both disabled and loading are specified', () => {
    render(<Button disabled loading={false}>비활성</Button>);
    expect(screen.getByRole('button', { name: '비활성' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '비활성' }).querySelector('svg.animate-spin')).not.toBeInTheDocument();
  });

  it('overrides explicit tabIndex on anchor when loading is true', () => {
    render(
      <Button as="a" href="/destination" loading tabIndex={0}>
        링크 버튼
      </Button>
    );

    const link = screen.getByRole('link', { name: '링크 버튼' });
    expect(link).toHaveAttribute('tabindex', '-1');
  });
});
