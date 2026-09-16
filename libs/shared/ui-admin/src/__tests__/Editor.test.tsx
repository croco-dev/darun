import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { MenuItem } from '../Editor/MenuItem';

describe('Editor components disabled and editable state', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders MenuItem enabled by default and disabled when requested', () => {
    const onClick = vi.fn();
    const { rerender } = render(<MenuItem label="Bold" onClick={onClick} />);

    const button = screen.getByRole('button', { name: 'Bold' }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);

    rerender(<MenuItem label="Bold" disabled={true} onClick={onClick} />);
    expect(button.disabled).toBe(true);
    expect(button.className).toContain('disabled:opacity-50');
  });
});
