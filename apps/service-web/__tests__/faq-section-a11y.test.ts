// @vitest-environment jsdom

import { FAQSection, type FAQItem } from '@darun/products-shell';
import { NextIntlClientProvider } from 'next-intl';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@darun/ui', () => ({
  SectionHeader: ({ title }: { title: string }) =>
    React.createElement('div', { 'data-testid': 'section-header' }, title),
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe('FAQSection Accessibility & Motion', () => {
  let root: Root | undefined;
  let container: HTMLDivElement;

  const mockItems: FAQItem[] = [
    { question: '첫 번째 질문', answer: '첫 번째 답변입니다.' },
    { question: '두 번째 질문', answer: '두 번째 답변입니다.' },
  ];

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

  function renderFAQ() {
    act(() => {
      root?.render(
        React.createElement(NextIntlClientProvider, {
          locale: 'ko',
          messages: { ProductDetail: { faq: { title: '자주 묻는 질문' } } },
          children: React.createElement(FAQSection, { items: mockItems }),
        })
      );
    });
  }

  describe('focus-visible ring', () => {
    it('focus-visible ring 클래스가 버튼에 존재한다', () => {
      renderFAQ();
      const button = container.querySelector('button');
      expect(button).not.toBeNull();
      expect(button!.className).toContain('focus-visible:outline-none');
      expect(button!.className).toContain('focus-visible:ring-2');
      expect(button!.className).toContain('focus-visible:ring-dark-900/60');
    });
  });

  describe('motion-reduce', () => {
    it('motion-reduce 클래스가 화살표 div에 존재한다', () => {
      renderFAQ();
      const arrowDiv = container.querySelector('button div[aria-hidden="true"]');
      expect(arrowDiv).not.toBeNull();
      expect(arrowDiv!.className).toContain('motion-reduce:transition-none');
      expect(arrowDiv!.className).toContain('motion-reduce:transform-none');
    });

    it('motion-reduce 클래스가 패널 section에 존재한다', () => {
      renderFAQ();
      const panel = container.querySelector('section[aria-labelledby]');
      expect(panel).not.toBeNull();
      expect(panel!.className).toContain('motion-reduce:transition-none');
    });
  });

  describe('transition 클래스', () => {
    it('transition-[max-height,opacity] 클래스가 패널에 존재한다', () => {
      renderFAQ();
      const panel = container.querySelector('section[aria-labelledby]');
      expect(panel).not.toBeNull();
      expect(panel!.className).toContain('transition-[max-height,opacity]');
    });
  });

  describe('ARIA 속성', () => {
    it('초기 상태에서 ARIA 속성이 올바르게 설정된다', () => {
      renderFAQ();
      const button = container.querySelector('button');
      const panel = container.querySelector('section[aria-labelledby]');
      expect(button).not.toBeNull();
      expect(panel).not.toBeNull();

      expect(button!.getAttribute('aria-expanded')).toBe('false');
      const panelId = panel!.getAttribute('id');
      expect(button!.getAttribute('aria-controls')).toBe(panelId);
      expect(panel!.getAttribute('aria-hidden')).toBe('true');
      const buttonId = button!.getAttribute('id');
      expect(panel!.getAttribute('aria-labelledby')).toBe(buttonId);
    });

    it('클릭 시 aria-expanded와 aria-hidden이 토글된다', () => {
      renderFAQ();
      const button = container.querySelector('button')!;
      const panel = container.querySelector('section[aria-labelledby]')!;

      expect(button.getAttribute('aria-expanded')).toBe('false');
      expect(panel.getAttribute('aria-hidden')).toBe('true');

      act(() => {
        button.click();
      });
      expect(button.getAttribute('aria-expanded')).toBe('true');
      expect(panel.getAttribute('aria-hidden')).toBe('false');

      act(() => {
        button.click();
      });
      expect(button.getAttribute('aria-expanded')).toBe('false');
      expect(panel.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('useId 기반 고유 ID 연결', () => {
    it('각 아이템의 버튼과 패널이 useId로 생성된 ID로 연결된다', () => {
      renderFAQ();
      const buttons = container.querySelectorAll('button');
      const panels = container.querySelectorAll('section[aria-labelledby]');

      expect(buttons.length).toBe(2);
      expect(panels.length).toBe(2);

      buttons.forEach((button, i) => {
        const panel = panels[i];
        const buttonId = button.getAttribute('id');
        const panelId = panel.getAttribute('id');

        expect(buttonId).toMatch(/^faq-button-/);
        expect(panelId).toMatch(/^faq-panel-/);
        expect(button.getAttribute('aria-controls')).toBe(panelId);
        expect(panel.getAttribute('aria-labelledby')).toBe(buttonId);
      });
    });
  });

  describe('scrollHeight 기반 동적 높이', () => {
    it('useEffect가 열림 상태에서 scrollHeight를 maxHeight로 설정한다', () => {
      renderFAQ();
      const panel = container.querySelector<HTMLElement>('section[aria-labelledby]')!;
      const button = container.querySelector('button')!;

      // useEffect로 scrollHeight를 읽는 내부 div의 scrollHeight를 모의
      const innerDiv = panel.querySelector('div');
      expect(innerDiv).not.toBeNull();
      Object.defineProperty(innerDiv!, 'scrollHeight', {
        value: 100,
        configurable: true,
      });

      expect(panel.style.maxHeight).toBe('0px');
      expect(panel.style.opacity).toBe('0');

      act(() => {
        button.click();
      });

      const maxHeight = panel.style.maxHeight;
      expect(maxHeight).toBe('100px');
      expect(panel.style.opacity).toBe('1');

      act(() => {
        button.click();
      });

      expect(panel.style.maxHeight).toBe('0px');
      expect(panel.style.opacity).toBe('0');
    });
  });
});
