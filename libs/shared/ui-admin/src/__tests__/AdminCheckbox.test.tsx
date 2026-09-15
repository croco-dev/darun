import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { AdminCheckbox } from '../AdminCheckbox';

describe('AdminCheckbox', () => {
  afterEach(() => {
    cleanup();
  });

  it('generates an id and links label with htmlFor when no id is passed', () => {
    render(<AdminCheckbox label="동의합니다" />);

    const checkbox = screen.getByRole('checkbox');
    const label = screen.getByText('동의합니다');

    expect(checkbox.id).toBeTruthy();
    expect(label.getAttribute('for')).toBe(checkbox.id);

    // Clicking the label toggles the checkbox
    expect((checkbox as HTMLInputElement).checked).toBe(false);
    fireEvent.click(label);
    expect((checkbox as HTMLInputElement).checked).toBe(true);
  });

  it('preserves explicitly passed id and connects label', () => {
    render(<AdminCheckbox id="custom-checkbox-id" label="사용자 정의 ID" />);

    const checkbox = screen.getByRole('checkbox');
    const label = screen.getByText('사용자 정의 ID');

    expect(checkbox.id).toBe('custom-checkbox-id');
    expect(label.getAttribute('for')).toBe('custom-checkbox-id');
  });
});
