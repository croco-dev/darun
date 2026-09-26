// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductDescription } from './ProductDescription';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'ko',
}));

describe('ProductDescription', () => {
  let root: Root | undefined;
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => root?.unmount());
      root = undefined;
    }
    document.body.replaceChildren();
  });

  it('separates concluding paragraphs and editor signature from the regret section', () => {
    const htmlWithByline = `
      <p>도입부 설명입니다.</p>
      <h2>주요 기능</h2>
      <p>기능 설명입니다.</p>
      <h2>추천한다면 -</h2>
      <ul>
        <li>생산성을 원하는 사용자</li>
      </ul>
      <h2>아쉽다면 -</h2>
      <ul>
        <li>무료 플랜 용량 제한</li>
      </ul>
      <p>총평: 그럼에도 불구하고 도입 가치가 충분합니다.</p>
      <p><em>2025년 9월 - Editor. DAO</em></p>
    `;

    act(() => {
      root?.render(<ProductDescription.ViewComponent description={htmlWithByline} />);
    });

    const regretCard = container.querySelector('.border-amber-200\\/90');
    expect(regretCard).not.toBeNull();
    expect(regretCard?.textContent).toContain('무료 플랜 용량 제한');
    expect(regretCard?.textContent).not.toContain('총평: 그럼에도 불구하고 도입 가치가 충분합니다.');
    expect(regretCard?.textContent).not.toContain('Editor. DAO');

    expect(container.textContent).toContain('총평: 그럼에도 불구하고 도입 가치가 충분합니다.');
    expect(container.textContent).toContain('2025년 9월 - Editor. DAO');
  });
});
