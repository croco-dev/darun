// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { lockBodyScroll } from './body-scroll-lock';

it.each([0, 1])('restores the original overflow after both overlapping locks release (first: %i)', first => {
  const body = document.createElement('body');
  body.style.overflow = 'auto';
  const release = [lockBodyScroll(body), lockBodyScroll(body)];
  expect(body.style.overflow).toBe('hidden');

  release[first]!();
  expect(body.style.overflow).toBe('hidden');
  release[1 - first]!();
  expect(body.style.overflow).toBe('auto');
});
