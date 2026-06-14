import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Breadcrumb } from './Breadcrumb';

describe('Breadcrumb', () => {
  it('renders a navigation landmark', () => {
    render(<Breadcrumb items={[{ label: '홈' }]} />);

    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
  });

  it('renders links for items with href and plain text for current item', () => {
    render(
      <Breadcrumb
        items={[
          { label: '홈', href: '/' },
          { label: '서비스', href: '/services' },
          { label: '상세', ariaCurrent: 'page' },
        ]}
      />
    );

    expect(screen.getByRole('link', { name: '홈' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: '서비스' })).toHaveAttribute('href', '/services');
    expect(screen.getByText('상세')).not.toHaveAttribute('href');
    expect(screen.getByText('상세')).toHaveAttribute('aria-current', 'page');
  });
});
