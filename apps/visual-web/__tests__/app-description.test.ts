import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AppDescription } from '../features/apps/AppDescription';

function render(description: string): string {
  return renderToStaticMarkup(createElement(AppDescription, { description }));
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
