// @vitest-environment jsdom

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AppDescription } from '../features/apps/AppDescription';

function render(description: string): string {
  return renderToStaticMarkup(createElement(AppDescription, { description }));
}

function renderDom(description: string): HTMLDivElement {
  const container = document.createElement('div');
  container.innerHTML = render(description);
  return container;
}

describe('AppDescription', () => {
  it('heading-only HTML을 시맨틱 태그로 렌더한다', () => {
    const out = render('<h2>소개</h2>');
    expect(out).toContain('<h2>소개</h2>');
    expect(out).not.toContain('&lt;h2');
  });

  it('list-only HTML을 p 래퍼 없이 렌더한다', () => {
    const out = render('<ul><li>항목</li></ul>');
    expect(out).toContain('<ul>');
    expect(out).toContain('<li>항목</li>');
    expect(out).not.toContain('<p');
    expect(out).not.toContain('&lt;ul');
  });

  it('앵글 텍스트를 이스케이프된 플레인 텍스트로 렌더한다', () => {
    const out = render('5 < 3 그리고 a > b');
    expect(out).toContain('&lt;');
    expect(out).toContain('<p');
    expect(out).not.toContain('<h2');
  });

  it.each([
    'SDK는 Promise<T>와 Array<string>를 지원합니다.',
    '<사용자명>에게 보낼 메시지',
    '5 < 3 그리고 a > b',
    '첫 줄: Promise<TResult>\n둘째 줄: Array<string>',
    '닫는 토큰 </T>도 일반 텍스트입니다.',
  ])('일반 설명의 꺾쇠와 줄바꿈을 보존한다: %s', description => {
    const container = renderDom(description);
    expect(container.textContent).toBe(description);
    expect(container.querySelector('p')?.className).toContain('whitespace-pre-line');
    expect(container.querySelector('p')?.children).toHaveLength(0);
  });

  it('HTML 안의 escaped 꺾쇠 텍스트와 인라인 서식을 함께 보존한다', () => {
    const container = renderDom('<h3>SDK</h3><p>Promise&lt;T&gt;와 <strong>Array&lt;string&gt;</strong></p>');
    expect(container.querySelector('h3')?.textContent).toBe('SDK');
    expect(container.querySelector('p')?.textContent).toBe('Promise<T>와 Array<string>');
    expect(container.querySelector('strong')?.textContent).toBe('Array<string>');
  });

  it('대소문자와 속성이 있는 HTML을 구조적으로 렌더한다', () => {
    const container = renderDom('<H2 title="기능">소개</H2><ol><li><a href="https://example.com">문서</a></li></ol>');
    expect(container.querySelector('h2')?.getAttribute('title')).toBe('기능');
    expect(container.querySelector('ol > li > a')?.getAttribute('href')).toBe('https://example.com');
    expect(container.textContent).toBe('소개문서');
  });

  it.each(['<script>alert(1)</script>', '<style>body{display:none}</style>'])(
    '금지 태그만 있는 HTML도 제거한다: %s',
    description => {
      expect(renderDom(description).textContent).toBe('');
    }
  );

  it('악성 페이로드를 무력화한다', () => {
    const out = render(
      '<p>본문</p><script>alert(1)</script><img src="x" onerror="alert(1)"><a href="javascript:alert(1)">클릭</a>'
    );
    expect(out).not.toContain('<script');
    expect(out).not.toContain('onerror');
    expect(out).not.toContain('javascript:');
    expect(out).toContain('본문');
  });
  it('임베디드 CSS로 전체 앱을 숨기거나 덮을 수 없다', () => {
    const out = render(
      '<p>소개 본문</p><style>body{display:none}</style><p style="position:fixed;inset:0;z-index:9999">덮개 문구</p><img style="position:fixed" src="https://example.com/a.png"><table><tr><td>셀</td></tr></table>'
    );
    expect(out).not.toContain('<style');
    expect(out).not.toMatch(/\sstyle=/i);
    expect(out).toContain('소개 본문');
    expect(out).toContain('덮개 문구');
    expect(out).toContain('<img');
    expect(out).toContain('<table');
  });

  it('빈 설명을 렌더하지 않는다', () => {
    expect(render('')).toBe('');
    expect(render('   ')).toBe('');
  });
});
