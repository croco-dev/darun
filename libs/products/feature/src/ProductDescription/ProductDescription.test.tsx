// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { ProductDescription } from './ProductDescription';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let root: Root | undefined;

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = undefined;
  }
  document.body.replaceChildren();
});

describe('ProductDescription', () => {
  it('shows text until sanitizer loads, then renders sanitized HTML', async () => {
    const description = `<p><strong>상세</strong></p><script>alert('xss')</script>`;
    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root?.render(<ProductDescription.ViewComponent description={description} />);
    });

    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).toContain(description);

    for (let index = 0; index < 10 && !container.querySelector('strong'); index += 1) {
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
    }

    expect(container.querySelector('strong')?.textContent).toBe('상세');
    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).not.toContain('<strong>');
  });
});
