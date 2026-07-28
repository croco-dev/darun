// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FAQSection, type FAQItem } from '../components/FAQSection/FAQSection';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@darun/ui', () => ({
  SectionHeader: ({ title }: { title: string }) => <div data-testid="section-header">{title}</div>,
}));

const faqItems: FAQItem[] = [
  { question: '첫 번째 질문', answer: '첫 번째 답변입니다.' },
  { question: '두 번째 질문', answer: '두 번째 답변입니다.' },
];

describe('FAQSection', () => {
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

  it('items가 없으면 null을 반환한다', () => {
    act(() => {
      root?.render(<FAQSection items={[]} />);
    });

    expect(container.querySelector('[data-testid="section-header"]')).toBeNull();
  });

  it('FAQ 항목을 렌더링한다', () => {
    act(() => {
      root?.render(<FAQSection items={faqItems} />);
    });

    const buttons = container.querySelectorAll('button');
    expect(buttons).toHaveLength(2);
    expect(buttons[0]?.textContent).toContain('첫 번째 질문');
    expect(buttons[1]?.textContent).toContain('두 번째 질문');
  });

  it('버튼 클릭 시 aria-expanded가 true로 변경된다', () => {
    act(() => {
      root?.render(<FAQSection items={faqItems} />);
    });

    const button = container.querySelector('button');
    expect(button?.getAttribute('aria-expanded')).toBe('false');

    act(() => {
      button?.click();
    });

    expect(button?.getAttribute('aria-expanded')).toBe('true');
  });

  it('버튼과 패널이 aria 관계를 갖는다', () => {
    act(() => {
      root?.render(<FAQSection items={faqItems} />);
    });

    const button = container.querySelector('button');
    const buttonId = button?.getAttribute('id');
    const panelId = button?.getAttribute('aria-controls');

    expect(buttonId).toBeTruthy();
    expect(panelId).toBeTruthy();

    const panel = container.querySelector(`[aria-labelledby="${buttonId}"]`);
    expect(panel?.getAttribute('id')).toBe(panelId);
  });
});
