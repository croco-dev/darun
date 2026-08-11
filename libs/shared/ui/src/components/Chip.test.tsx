import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Chip } from './Chip';

describe('Chip', () => {
  it('renders div chip by default', () => {
    render(<Chip>기본 칩</Chip>);

    expect(screen.getByText('기본 칩')).toBeInTheDocument();
    expect(screen.getByText('기본 칩').tagName).toBe('DIV');
  });

  it('renders anchor chip when as is a', () => {
    render(
      <Chip as="a" href="/tag">
        태그
      </Chip>
    );

    expect(screen.getByRole('link', { name: '태그' })).toHaveAttribute('href', '/tag');
  });

  it('renders button chip when as is button', () => {
    render(<Chip as="button">필터</Chip>);

    expect(screen.getByRole('button', { name: '필터' })).toBeInTheDocument();
  });

  it('applies color variant classes', () => {
    const { container } = render(<Chip color="filledDark">어두운 칩</Chip>);

    expect(container.firstChild).toHaveClass('border-transparent', 'bg-dark-900', 'text-dark-100');
  });
});
