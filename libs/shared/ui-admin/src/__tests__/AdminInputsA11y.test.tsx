import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { AdminInput, AdminTextarea } from '../AdminInput';
import { AdminSelect } from '../AdminSelect';

describe('Admin form controls accessibility id generation', () => {
  afterEach(() => {
    cleanup();
  });

  it('generates an auto id when id is not provided for AdminInput', () => {
    render(<AdminInput placeholder="이름" />);
    const input = screen.getByPlaceholderText('이름');
    expect(input.id).toBeTruthy();
  });

  it('preserves explicitly provided id for AdminInput', () => {
    render(<AdminInput id="custom-input" placeholder="이름" />);
    const input = screen.getByPlaceholderText('이름');
    expect(input.id).toBe('custom-input');
  });

  it('generates an auto id when id is not provided for AdminTextarea', () => {
    render(<AdminTextarea placeholder="설명" />);
    const textarea = screen.getByPlaceholderText('설명');
    expect(textarea.id).toBeTruthy();
  });

  it('preserves explicitly provided id for AdminTextarea', () => {
    render(<AdminTextarea id="custom-textarea" placeholder="설명" />);
    const textarea = screen.getByPlaceholderText('설명');
    expect(textarea.id).toBe('custom-textarea');
  });

  it('generates an auto id when id is not provided for AdminSelect', () => {
    render(
      <AdminSelect data-testid="select">
        <option value="1">옵션</option>
      </AdminSelect>
    );
    const select = screen.getByTestId('select');
    expect(select.id).toBeTruthy();
  });

  it('preserves explicitly provided id for AdminSelect', () => {
    render(
      <AdminSelect id="custom-select" data-testid="select">
        <option value="1">옵션</option>
      </AdminSelect>
    );
    const select = screen.getByTestId('select');
    expect(select.id).toBe('custom-select');
  });
});
