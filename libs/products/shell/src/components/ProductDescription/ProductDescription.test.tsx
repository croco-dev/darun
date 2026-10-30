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

  it.each(['ul', 'ol'])('preserves mixed nested lists inside a highlighted %s', listTag => {
    const list = `<${listTag}><li>Parent<ol start="3"><li>Nested first</li><li>Nested second<ul><li>Deep child</li></ul></li></ol></li><li>Sibling</li></${listTag}>`;
    act(() => {
      root?.render(
        <ProductDescription.ViewComponent description={`<p>Intro</p><h2>추천한다면</h2>${list}<p>Conclusion</p>`} />
      );
    });

    const card = container.querySelector('.border-leaf-200\\/90');
    expect(card?.querySelector(listTag)?.outerHTML).toBe(list);
    expect(container.querySelectorAll('li')).toHaveLength(5);
    expect(container.querySelectorAll('li:not(ul > li):not(ol > li)')).toHaveLength(0);
    expect(card?.textContent).not.toContain('Conclusion');
    expect(container.textContent).toBe('Intro추천한다면ParentNested firstNested secondDeep childSiblingConclusion');
  });

  it('keeps a blockquote with a nested heading, rule and list intact', () => {
    const quote =
      '<blockquote><h3>Context</h3><p>Before</p><hr><ul><li>First</li><li>Second</li></ul><p>After</p></blockquote>';
    act(() => {
      root?.render(<ProductDescription.ViewComponent description={`<h2>Limitations</h2>${quote}<p>Outside</p>`} />);
    });

    const card = container.querySelector('.border-yellow-200\\/90');
    expect(card?.querySelector('blockquote')?.outerHTML).toBe(quote);
    expect(card?.textContent).toBe('LimitationsContextBeforeFirstSecondAfter');
    expect(container.textContent).toBe('LimitationsContextBeforeFirstSecondAfterOutside');
  });

  it.each([
    ['<h2>추천한다면</h2>', 'leaf'],
    ['<h3>아쉽다면</h3>', 'yellow'],
    ['<h2><strong>Recommended\nif</strong></h2>', 'leaf'],
    ['<h3>Things to<br>consider</h3>', 'yellow'],
  ])('recognizes a top-level heading %s without losing content', (heading, color) => {
    act(() => {
      root?.render(
        <ProductDescription.ViewComponent
          description={`<p>Intro</p>${heading}<p>Details</p><ul><li>Item</li></ul><p>Outside</p>`}
        />
      );
    });

    const card = container.querySelector(`.border-${color}-200\\/90`);
    expect(card?.querySelector('h2,h3')?.outerHTML).toBe(heading);
    expect(card?.textContent).toContain('DetailsItem');
    expect(card?.textContent).not.toContain('Outside');
    expect(container.querySelectorAll('p')).toHaveLength(3);
    expect(container.querySelectorAll('li')).toHaveLength(1);
  });

  it('ends an unlisted highlight at a top-level rule or the next heading', () => {
    act(() => {
      root?.render(
        <ProductDescription.ViewComponent description="<h2>Pros</h2><p>Benefit</p><hr><p>Outside</p><h3>Cons</h3><p>Tradeoff</p><h2>Summary</h2><p>End</p>" />
      );
    });

    expect(container.querySelector('.border-leaf-200\\/90')?.textContent).toBe('ProsBenefit');
    expect(container.querySelector('.border-yellow-200\\/90')?.textContent).toBe('ConsTradeoff');
    expect(container.textContent).toBe('ProsBenefitOutsideConsTradeoffSummaryEnd');
    expect(container.querySelectorAll('hr')).toHaveLength(1);
  });

  it('preserves ordinary content and sanitizes unsafe markup before sectioning', () => {
    act(() => {
      root?.render(
        <ProductDescription.ViewComponent
          description={
            'Plain &amp; safe<p onclick="alert(1)">Text <a href="javascript:alert(1)">link</a></p><script>alert(1)</script><blockquote><h2>Pros</h2><p>Quoted</p></blockquote>'
          }
        />
      );
    });

    expect(container.textContent).toBe('Plain & safeText linkProsQuoted');
    expect(container.querySelector('script,[onclick],a[href]')).toBeNull();
    expect(container.querySelector('blockquote h2')?.textContent).toBe('Pros');
    expect(container.querySelector('.border-leaf-200\\/90')).toBeNull();
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

    const regretCard = container.querySelector('.border-yellow-200\\/90');
    expect(regretCard).not.toBeNull();
    expect(regretCard?.textContent).toContain('무료 플랜 용량 제한');
    expect(regretCard?.textContent).not.toContain('총평: 그럼에도 불구하고 도입 가치가 충분합니다.');
    expect(regretCard?.textContent).not.toContain('Editor. DAO');

    expect(container.textContent).toContain('총평: 그럼에도 불구하고 도입 가치가 충분합니다.');
    expect(container.textContent).toContain('2025년 9월 - Editor. DAO');
  });
});
