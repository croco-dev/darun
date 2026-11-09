// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { ProductSearchSuggest } from '../features/product-search/ProductSearchSuggest';

const suggestions = [
  { id: 'payments', slug: 'payments', name: '결제 서비스', logoUrl: '' },
  { id: 'invoices', slug: 'invoices', name: '청구 서비스', logoUrl: '' },
];

function mount() {
  const select = vi.fn();
  const close = vi.fn();
  const submit = vi.fn();

  function SearchForm() {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
      <form
        onSubmit={event => {
          event.preventDefault();
          submit();
        }}
      >
        <input ref={inputRef} id="search" aria-label="검색" defaultValue="결제" />
        <ProductSearchSuggest
          inputId="search"
          inputRef={inputRef}
          inputValue="결제"
          suggestions={suggestions}
          isSearching={false}
          onSelect={select}
          onClose={close}
        />
        <button type="submit">검색</button>
      </form>
    );
  }

  render(<SearchForm />);
  const input = screen.getByRole<HTMLInputElement>('textbox', { name: '검색' });
  input.focus();
  return { input, select, close, submit };
}

function pressEnter(input: HTMLInputElement, flags: KeyboardEventInit = {}) {
  // jsdom does not run the browser's implicit form submission after keydown.
  const defaultAllowed = fireEvent.keyDown(input, { key: 'Enter', ...flags });
  if (defaultAllowed) fireEvent.submit(input.form!);
  return defaultAllowed;
}

afterEach(cleanup);

it('keeps the input and popup inside the same click boundary', () => {
  const { input, close, select } = mount();
  fireEvent.mouseDown(input);
  input.setSelectionRange(1, 1);
  fireEvent.mouseUp(input);
  fireEvent.click(input);
  expect(input.selectionStart).toBe(1);
  expect(close).not.toHaveBeenCalled();

  const option = screen.getByRole('option', { name: '청구 서비스' });
  fireEvent.mouseDown(option);
  fireEvent.mouseUp(option);
  fireEvent.click(option);
  expect(select).toHaveBeenCalledExactlyOnceWith(suggestions[1]);
  expect(close).not.toHaveBeenCalled();

  fireEvent.click(document.body);
  expect(close).toHaveBeenCalledTimes(1);
});

it.each([
  { isComposing: true, keyCode: 13 },
  { isComposing: false, keyCode: 229 },
])('keeps the active suggestion through IME confirmation (%j)', flags => {
  const { input, select, close, submit } = mount();
  fireEvent.keyDown(input, { key: 'ArrowDown' });
  fireEvent.compositionStart(input);

  expect(fireEvent.keyDown(input, { key: 'ArrowDown', ...flags })).toBe(true);
  expect(fireEvent.keyDown(input, { key: 'Escape', ...flags })).toBe(true);
  expect(pressEnter(input, flags)).toBe(true);
  // A browser can activate the default submit button from the confirmation key.
  fireEvent.click(screen.getByRole('button', { name: '검색' }));
  expect(screen.getByRole('option', { selected: true }).textContent).toBe('결제 서비스');
  expect(select).not.toHaveBeenCalled();
  expect(close).not.toHaveBeenCalled();
  expect(submit).not.toHaveBeenCalled();

  fireEvent.compositionEnd(input, { data: '제' });
  fireEvent.keyUp(input, { key: 'Enter' });
  pressEnter(input);
  expect(select).toHaveBeenCalledExactlyOnceWith(suggestions[0]);
  expect(submit).not.toHaveBeenCalled();
  fireEvent.keyDown(input, { key: 'Escape' });
  expect(close).toHaveBeenCalledTimes(1);
});

it.each([
  { isComposing: true, keyCode: 13 },
  { isComposing: false, keyCode: 229 },
])('submits the form only on a separate Enter with no active option (%j)', flags => {
  const { input, select, submit } = mount();
  fireEvent.compositionStart(input);
  expect(pressEnter(input, flags)).toBe(true);
  expect(submit).not.toHaveBeenCalled();

  fireEvent.compositionEnd(input, { data: '제' });
  fireEvent.keyUp(input, { key: 'Enter' });
  pressEnter(input);
  expect(submit).toHaveBeenCalledTimes(1);
  expect(select).not.toHaveBeenCalled();
});

it('allows the search button after an IME confirmation', () => {
  const { input, submit } = mount();
  pressEnter(input, { keyCode: 229 });
  expect(submit).not.toHaveBeenCalled();

  const button = screen.getByRole('button', { name: '검색' });
  fireEvent.pointerDown(button);
  fireEvent.click(button, { detail: 1 });
  expect(submit).toHaveBeenCalledTimes(1);

  pressEnter(input, { repeat: true });
  expect(submit).toHaveBeenCalledTimes(1);
});

it('does not submit when the IME confirmation key repeats after compositionend', () => {
  const { input, submit } = mount();
  fireEvent.compositionStart(input);
  fireEvent.keyDown(input, { key: 'Process', code: 'Enter', keyCode: 229, isComposing: true });
  fireEvent.compositionEnd(input, { data: '제' });
  fireEvent.keyUp(input, { key: 'Shift' });
  fireEvent.pointerDown(input);
  fireEvent.click(input, { detail: 1 });

  pressEnter(input, { code: 'Enter', repeat: true });
  expect(submit).not.toHaveBeenCalled();

  fireEvent.keyUp(input, { key: 'Enter', code: 'Enter' });
  pressEnter(input, { code: 'Enter' });
  expect(submit).toHaveBeenCalledTimes(1);
});

it('keeps the confirmation key blocked when focus moves before keyup', () => {
  const { input, submit } = mount();
  const button = screen.getByRole('button', { name: '검색' });
  input.focus();
  pressEnter(input, { keyCode: 229 });
  expect(submit).not.toHaveBeenCalled();

  button.focus();
  expect(fireEvent.keyDown(button, { key: 'Enter', repeat: true })).toBe(false);
  expect(submit).not.toHaveBeenCalled();

  input.focus();
  pressEnter(input, { repeat: true });
  expect(submit).not.toHaveBeenCalled();

  button.focus();
  fireEvent.keyUp(button, { key: 'Enter' });
  fireEvent.click(button);
  expect(submit).toHaveBeenCalledTimes(1);
});

it('allows deliberate keyboard activation of the search button while Enter is held', () => {
  const { input, submit } = mount();
  pressEnter(input, { keyCode: 229 });

  const button = screen.getByRole('button', { name: '검색' });
  button.focus();
  expect(fireEvent.keyDown(button, { key: ' ' })).toBe(true);
  expect(fireEvent.keyUp(button, { key: ' ' })).toBe(true);
  fireEvent.click(button);
  expect(submit).toHaveBeenCalledTimes(1);

  input.focus();
  expect(pressEnter(input, { repeat: true })).toBe(false);
  expect(submit).toHaveBeenCalledTimes(1);
});
