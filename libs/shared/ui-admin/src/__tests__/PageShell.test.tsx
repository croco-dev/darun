import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { PageShell } from '../PageShell';

describe('PageShell', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders title and children without back button when neither onBack nor backHref is provided', () => {
    render(
      <PageShell title="대시보드">
        <div>콘텐츠</div>
      </PageShell>
    );

    expect(screen.getByText('대시보드')).not.toBeNull();
    expect(screen.getByText('콘텐츠')).not.toBeNull();
    expect(screen.queryByLabelText('뒤로가기')).toBeNull();
  });

  it('renders button and calls onBack callback when onBack is provided', () => {
    const handleBack = vi.fn();
    render(
      <PageShell title="상세 페이지" onBack={handleBack}>
        <div>콘텐츠</div>
      </PageShell>
    );

    const backButton = screen.getByLabelText('뒤로가기');
    expect(backButton.tagName).toBe('BUTTON');

    fireEvent.click(backButton);
    expect(handleBack).toHaveBeenCalledTimes(1);
  });

  it('renders link with href when backHref is provided', () => {
    render(
      <PageShell title="설정 페이지" backHref="/settings">
        <div>콘텐츠</div>
      </PageShell>
    );

    const backLink = screen.getByLabelText('뒤로가기');
    expect(backLink.tagName).toBe('A');
    expect(backLink.getAttribute('href')).toBe('/settings');
  });
});
