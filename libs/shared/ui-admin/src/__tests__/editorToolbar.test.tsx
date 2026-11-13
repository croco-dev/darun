import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Editor } from '@tiptap/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createAdminEditorExtensions } from '../Editor/extensions';
import { MenuBar } from '../Editor/MenuBar';

vi.mock('@darun/utils-image-upload', () => ({
  useImageUpload: () => ({ upload: vi.fn() }),
}));

const editors: Editor[] = [];

function createEditor(content: string) {
  const editor = new Editor({
    content,
    extensions: createAdminEditorExtensions(),
  });
  editors.push(editor);
  return editor;
}

afterEach(() => {
  cleanup();
  for (const editor of editors.splice(0)) editor.destroy();
  vi.restoreAllMocks();
});

function expectPressed(label: string, active: boolean) {
  const button = screen.getByRole('button', { name: label });
  expect(button.getAttribute('aria-pressed')).toBe(String(active));
  expect(button.classList.contains('bg-dark-900')).toBe(active);
}

it('reflects bold toggles with the caret in an unchanged paragraph', () => {
  const editor = createEditor('<p>plain</p>');
  render(<MenuBar editor={editor} />);
  const bold = screen.getByRole('button', { name: 'B' });

  expectPressed('B', false);
  fireEvent.click(bold);
  expect(editor.isActive('bold')).toBe(true);
  expectPressed('B', true);
  fireEvent.click(bold);
  expect(editor.isActive('bold')).toBe(false);
  expectPressed('B', false);
});

it('updates pressed buttons when the caret moves between existing formats', () => {
  const editor = createEditor(
    '<p>plain</p><h2>heading</h2><ul><li><p>item</p></li></ul><p><strong>marked</strong></p>'
  );
  render(<MenuBar editor={editor} />);

  act(() => {
    editor.commands.setTextSelection(9);
  });
  expectPressed('H2', true);
  expectPressed('H1', false);
  act(() => {
    editor.commands.setTextSelection(20);
  });
  expectPressed('H2', false);
  expectPressed('• List', true);
  act(() => {
    editor.commands.setTextSelection(28);
  });
  expectPressed('• List', false);
  expectPressed('B', true);
  act(() => {
    editor.commands.setTextSelection(2);
  });
  expectPressed('B', false);
});

it('uses the replacement editor immediately and unsubscribes from the old and unmounted editors', () => {
  const first = createEditor('<p><strong>old</strong></p>');
  const second = createEditor('<h3>new</h3><p>plain</p>');
  const firstOn = vi.spyOn(first, 'on');
  const firstOff = vi.spyOn(first, 'off');
  const secondOn = vi.spyOn(second, 'on');
  const secondOff = vi.spyOn(second, 'off');
  const view = render(<MenuBar editor={first} />);

  expectPressed('B', true);
  view.rerender(<MenuBar editor={second} />);
  expectPressed('B', false);
  expectPressed('H3', true);
  const firstListener = firstOn.mock.calls.find(([event]) => event === 'transaction')?.[1];
  expect(firstListener).toBeTypeOf('function');
  expect(firstOff).toHaveBeenCalledWith('transaction', firstListener);

  act(() => {
    second.commands.setTextSelection(7);
  });
  expectPressed('H3', false);
  view.unmount();
  const secondListener = secondOn.mock.calls.find(([event]) => event === 'transaction')?.[1];
  expect(secondListener).toBeTypeOf('function');
  expect(secondOff).toHaveBeenCalledWith('transaction', secondListener);
});
