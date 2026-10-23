// @vitest-environment jsdom
import React, { act, useLayoutEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { useProductUserAction } from './useProductUserAction';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }));
vi.mock('@apollo/client/react', () => ({
  useQuery: () => ({ data: { productBySlug: { voteCount: 3 } } }),
  useMutation: () => [mutate],
}));
vi.mock('next-intl', () => ({ useLocale: () => 'en' }));
let current: {
  upvoteProduct: () => Promise<void>;
  slug: string;
  voted: boolean;
  loading: boolean;
  success: boolean;
  error: string | null;
};
function Probe({ slug }: { slug: string }) {
  const value = useProductUserAction({ slug });
  useLayoutEffect(() => {
    current = value;
  });
  return null;
}
const container = document.createElement('div');
let root: Root;
afterEach(() => {
  act(() => root.unmount());
  localStorage.clear();
  mutate.mockReset();
});

it('deduplicates synchronous clicks and ignores a previous product response', async () => {
  const { promise, resolve } = Promise.withResolvers<object>();
  mutate.mockReturnValue(promise);
  root = createRoot(container);
  act(() => {
    root.render(<Probe slug="first" />);
  });
  let pending!: Promise<void>;
  act(() => {
    pending = current.upvoteProduct();
    void current.upvoteProduct();
  });
  expect(mutate).toHaveBeenCalledTimes(1);
  act(() => {
    root.render(<Probe slug="second" />);
  });
  expect(current.loading).toBe(false);
  await act(async () => {
    resolve({});
    await pending;
  });
  expect(current.slug).toBe('second');
  expect(current.voted).toBe(false);
  expect(current.success).toBe(false);
  expect(current.error).toBeNull();
  expect(JSON.parse(localStorage.getItem('darun-voted-products')!)).toEqual(['first']);
});

it('restores a recorded vote without success or another mutation', async () => {
  localStorage.setItem('darun-voted-products', JSON.stringify(['saved']));
  root = createRoot(container);
  act(() => {
    root.render(<Probe slug="saved" />);
  });
  expect(current.voted).toBe(true);
  expect(current.success).toBe(false);
  await act(async () => {
    await current.upvoteProduct();
  });
  expect(mutate).not.toHaveBeenCalled();
});

it('does not restore stale loading or success after leaving and revisiting a slug', async () => {
  const { promise, resolve } = Promise.withResolvers<object>();
  mutate.mockReturnValue(promise);
  root = createRoot(container);
  act(() => {
    root.render(<Probe slug="first" />);
  });
  let pending!: Promise<void>;
  act(() => {
    pending = current.upvoteProduct();
  });
  act(() => {
    root.render(<Probe slug="second" />);
  });
  act(() => {
    root.render(<Probe slug="first" />);
  });
  expect(current.loading).toBe(false);
  await act(async () => {
    resolve({});
    await pending;
  });
  expect(current.loading).toBe(false);
  expect(current.success).toBe(false);
  expect(current.voted).toBe(true);
});
