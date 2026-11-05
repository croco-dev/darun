import { Link } from '@darun/utils-router';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

afterEach(cleanup);

describe('Button', () => {
  it('renders as a button by default', () => {
    render(<Button>확인</Button>);

    expect(screen.getByRole('button', { name: '확인' })).toBeInTheDocument();
  });

  it('renders as an anchor when href is provided', () => {
    render(
      <Button href="/path" as="a" target="_blank" rel="noopener noreferrer">
        링크
      </Button>
    );

    const link = screen.getByRole('link', { name: '링크' });
    expect(link).toHaveAttribute('href', '/path');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it.each([
    { name: 'anchor', as: 'a' as const },
    { name: 'Next Link', as: Link },
  ])('disables $name until the action is available again', ({ as }) => {
    const onClick = vi.fn();
    const { rerender } = render(
      <Button as={as} href="/path" target="_blank" rel="noopener noreferrer" disabled onClick={onClick}>
        취소
      </Button>
    );

    const disabled = screen.getByRole('button', { name: '취소' });
    expect(disabled).toBeDisabled();
    expect(disabled).toHaveAttribute('type', 'button');
    expect(disabled).not.toHaveAttribute('href');
    expect(disabled).not.toHaveAttribute('target');
    expect(disabled).not.toHaveAttribute('rel');
    disabled.focus();
    expect(disabled).not.toHaveFocus();
    fireEvent.click(disabled);
    expect(onClick).not.toHaveBeenCalled();

    rerender(
      <Button as={as} href="/path" target="_blank" rel="noopener noreferrer" onClick={onClick}>
        취소
      </Button>
    );
    const link = screen.getByRole('link', { name: '취소' });
    expect(link).toHaveAttribute('href', '/path');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    link.focus();
    expect(link).toHaveFocus();
    fireEvent.click(link);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('keeps native buttons disabled and restores their submit behavior', () => {
    const onSubmit = vi.fn(event => event.preventDefault());
    const onClick = vi.fn();
    const { rerender } = render(
      <form onSubmit={onSubmit}>
        <Button type="submit" disabled onClick={onClick}>
          저장
        </Button>
      </form>
    );
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(onClick).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();

    rerender(
      <form onSubmit={onSubmit}>
        <Button type="submit" onClick={onClick}>
          저장
        </Button>
      </form>
    );
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('maps kind to variant and color without explicit variant props', () => {
    const { container } = render(<Button kind="textActive">활성 메뉴</Button>);

    expect(container.querySelector('button')).toHaveClass('bg-dark-100');
  });

  it('preserves the base variant by default', () => {
    const { container } = render(<Button>기본</Button>);

    expect(container.querySelector('button')).toHaveClass('border-dark-900', 'bg-dark-900', 'text-white');
  });
});
