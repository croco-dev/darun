// @vitest-environment jsdom

import React, { act, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { useHeaderSearchForm } from '../../../libs/shared/ui-layout/src/libs/HeaderSearchForm/useHeaderSearchForm';

const router = vi.hoisted(() => ({ query: 'first', pathname: '/en/search/product', navigate: vi.fn() }));
vi.mock('@darun/utils-router', () => ({
  useSearchParams: () => new URLSearchParams({ query: router.query }),
  usePathname: () => router.pathname,
  useNavigate: () => router.navigate,
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const container = document.createElement('div');
const root = createRoot(container);
let state: ReturnType<typeof useHeaderSearchForm>;

function Form() {
  const form = useHeaderSearchForm();
  useEffect(() => {
    state = form;
  });
  return React.createElement('input', { value: form.query, readOnly: true });
}

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

it('preserves the draft until the URL query changes and submits the current locale and value', () => {
  document.body.appendChild(container);
  act(() => root.render(React.createElement(Form)));
  expect(container.querySelector('input')?.value).toBe('first');

  act(() => state.setQuery('  draft & value  '));
  act(() => root.render(React.createElement(Form)));
  expect(container.querySelector('input')?.value).toBe('  draft & value  ');
  state.onSubmit({ preventDefault: vi.fn() });
  expect(router.navigate).toHaveBeenLastCalledWith('/en/search/product?query=draft%20%26%20value');

  router.query = 'second';
  act(() => root.render(React.createElement(Form)));
  expect(container.querySelector('input')?.value).toBe('second');

  router.query = '';
  act(() => root.render(React.createElement(Form)));
  expect(container.querySelector('input')?.value).toBe('');
  state.onSubmit({ preventDefault: vi.fn() });
  expect(router.navigate).toHaveBeenLastCalledWith('/en/search/product');
});
