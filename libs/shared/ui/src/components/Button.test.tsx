import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders as a button by default', () => {
    render(<Button>확인</Button>);

    expect(screen.getByRole('button', { name: '확인' })).toBeInTheDocument();
  });

  it('renders as an anchor when href is provided', () => {
    render(
      <Button href="/path" as="a">
        링크
      </Button>
    );

    const link = screen.getByRole('link', { name: '링크' });
    expect(link).toHaveAttribute('href', '/path');
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
