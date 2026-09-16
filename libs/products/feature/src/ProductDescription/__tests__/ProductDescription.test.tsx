// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { ProductDescription } from '../ProductDescription';

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
  it('shows skeleton until sanitizer loads, then renders sanitized HTML', async () => {
    const description = `<p><strong>상세</strong></p><script>alert('xss')</script>`;
    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root?.render(
        <ProductDescription.ViewComponent
          description={description}
          loading={false}
          error={undefined}
          refetch={async () => ({}) as never}
        />
      );
    });

    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('.animate-pulse')).not.toBeNull();

    for (let index = 0; index < 10 && !container.querySelector('strong'); index += 1) {
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
    }

    expect(container.querySelector('strong')?.textContent).toBe('상세');
    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).not.toContain('<strong>');
  });

  it('renders empty message when description is empty or only whitespace', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root?.render(
        <ProductDescription.ViewComponent
          description="   "
          loading={false}
          error={undefined}
          refetch={async () => ({}) as never}
        />
      );
    });

    expect(container.textContent).toBe('설명이 없습니다.');
  });

  it('renders loading state when loading is true', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root?.render(
        <ProductDescription.ViewComponent
          description={null}
          loading={true}
          error={undefined}
          refetch={async () => ({}) as never}
        />
      );
    });

    expect(container.textContent).toContain('불러오는 중...');
  });

  it('renders error state when error is provided', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root?.render(
        <ProductDescription.ViewComponent
          description={null}
          loading={false}
          error={new Error('인증 오류')}
          refetch={async () => ({}) as never}
        />
      );
    });

    expect(container.textContent).toContain('설명을 불러오지 못했습니다.');
    expect(container.textContent).toContain('다시 시도');
  });
});
