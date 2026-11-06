import MarkdownIt from 'markdown-it';
import { describe, expect, it } from 'vitest';
import {
  buildCategoryMarkdown,
  buildCompareMarkdown,
  buildHomeMarkdown,
  buildMagazineMarkdown,
  buildNotFoundMarkdown,
  buildProductAlternativesMarkdown,
  buildProductMarkdown,
  buildRankingMarkdown,
  escapeMarkdown,
  htmlToMarkdown,
  safeUrl,
} from '../lib/seo/markdown-builder';
import { contentHtml, contentMarkdown } from './markdown-content.fixture';

describe('markdown-builder helpers', () => {
  describe('escapeMarkdown', () => {
    it('마크다운 제어 문자를 이스케이프한다', () => {
      const input = '[Notion](https://notion.so) #1 *cool* _fast_ `code`';
      const escaped = escapeMarkdown(input);
      expect(escaped).toBe('\\[Notion\\]\\(https://notion.so\\) \\#1 \\*cool\\* \\_fast\\_ \\`code\\`');
    });
  });

  describe('safeUrl', () => {
    it('http 및 https URL만 통과시킨다', () => {
      expect(safeUrl('https://darun.io')).toBe('https://darun.io/');
      expect(safeUrl('http://example.com/path')).toBe('http://example.com/path');
      expect(safeUrl('javascript:alert(1)')).toBeNull();
      expect(safeUrl('data:text/html,<script></script>')).toBeNull();
      expect(safeUrl('not-a-url')).toBeNull();
      expect(safeUrl(null)).toBeNull();
    });
  });

  describe('htmlToMarkdown', () => {
    it('링크·이미지·시작 번호와 중첩 목록을 보존한다', () => {
      expect(htmlToMarkdown(contentHtml)).toBe(contentMarkdown);
    });

    it('독립 Markdown 파서가 링크·이미지와 실제 중첩 목록으로 읽는다', () => {
      const rendered = new MarkdownIt({ html: true }).render(htmlToMarkdown(contentHtml));
      expect(rendered).toContain('<a href="https://example.com/docs?a=1&amp;b=2"><strong>설명서</strong></a>');
      expect(rendered).toContain('<img src="https://example.com/screen.png" alt="검색 결과 화면">');
      expect(rendered).toContain('<ol start="3">\n<li>');
      expect(rendered).toContain('<ul>\n<li>환경 확인</li>\n</ul>\n</li>\n<li>');
    });

    it('HTML 줄바꿈과 코드 안의 HTML은 각각 줄바꿈과 코드로 읽힌다', () => {
      const markdown = htmlToMarkdown('<p>앞<br>뒤</p><pre><code>&lt;img src=x onerror=alert(1)&gt;</code></pre>');
      const rendered = new MarkdownIt({ html: true }).render(markdown);
      expect(rendered).toContain('앞<br>\n뒤');
      expect(rendered).toContain('<pre><code>&lt;img src=x onerror=alert(1)&gt;\n</code></pre>');
      expect(rendered).not.toContain('<img');
    });

    it('여러 문단의 인용과 코드 안의 공백·백틱을 보존한다', () => {
      const html =
        '<blockquote><p>첫 문단</p><p>다음 <code>a`b</code></p></blockquote><pre><code>one\n\n\n  ```two```\n</code></pre>';
      expect(htmlToMarkdown(html)).toBe('> 첫 문단\n>\n> 다음 ``a`b``\n\n````\none\n\n\n  ```two```\n````');
    });

    it('지원하지 않는 블록과 잘못 닫은 목록의 읽을 수 있는 내용을 유지한다', () => {
      expect(
        htmlToMarkdown(
          '<section><div>앞</div><div>뒤 &copy; &#x1f680;</div></section><ol start="9"><li>아홉<li>열</ol>'
        )
      ).toBe('앞\n\n뒤 © 🚀\n\n9. 아홉\n10. 열');
    });

    it('비허용 URL과 raw HTML·본문의 Markdown 주입을 출력하지 않는다', () => {
      const html =
        '<script>secret()</script><style>hidden</style><!--comment--><p><a href="jav&#x61;script:alert(1)">위험</a><img src="data:text/html,evil" alt="설명"></p><p>&lt;img src=x onerror=alert(1)&gt; [외부](javascript:alert(2))</p>';
      const markdown = htmlToMarkdown(html);
      expect(markdown).toContain('위험설명');
      expect(markdown).toContain('&lt;img src=x onerror=alert\\(1\\)&gt;');
      expect(markdown).toContain('\\[외부\\]\\(javascript:alert\\(2\\)\\)');
      expect(markdown).not.toMatch(/<|secret|hidden|comment|data:text|\]\(javascript/);
      const rendered = new MarkdownIt({ html: true }).render(markdown);
      expect(rendered).not.toMatch(/<(?:a|img|script|style)\b/);
      expect(rendered).toContain('&lt;img src=x onerror=alert(1)&gt;');
    });

    it('URL의 Markdown 구분자와 이미지 대체 텍스트를 이스케이프한다', () => {
      expect(
        htmlToMarkdown(
          '<a href="https://example.com/a(b)">[문서]</a><img src="https://example.com/p(x).png" alt="[화면] *원본*">'
        )
      ).toBe('[\\[문서\\]](https://example.com/a%28b%29)![\\[화면\\] \\*원본\\*](https://example.com/p%28x%29.png)');
    });

    it('목적지의 entity 모양 문자열도 원래 링크와 이미지 주소를 유지한다', () => {
      const markdown = htmlToMarkdown(
        '<a href="https://example.com/?q=&amp;copy;">문서</a><img src="https://example.com/?q=&amp;quot;" alt="화면">'
      );
      const rendered = new MarkdownIt({ html: true }).render(markdown);
      expect(rendered).toContain('href="https://example.com/?q=&amp;copy;"');
      expect(rendered).toContain('src="https://example.com/?q=&amp;quot;"');
    });

    it('백슬래시 뒤의 Markdown 문법도 링크가 아닌 원문으로 읽힌다', () => {
      const text = String.raw`C:\docs\[note](https://example.com/)`;
      const markdown = htmlToMarkdown(`<p>${text}</p>`);
      expect(new MarkdownIt({ html: true }).render(markdown)).toBe(`<p>${text}</p>\n`);
    });

    it('HTML 태그를 적절한 마크다운 문법으로 변환한다', () => {
      const html = `
        <script>alert('xss')</script>
        <h3>주요 기능</h3>
        <p>이 서비스는 <strong>강력</strong>하고 <em>유용</em>합니다.</p>
        <ul>
          <li>첫 번째 항목</li>
          <li>두 번째 항목</li>
        </ul>
        <blockquote>추천 인용문</blockquote>
      `;
      const md = htmlToMarkdown(html);
      expect(md).not.toContain('<script>');
      expect(md).toContain('### 주요 기능');
      expect(md).toContain('**강력**');
      expect(md).toContain('*유용*');
      expect(md).toContain('* 첫 번째 항목');
      expect(md).toContain('* 두 번째 항목');
      expect(md).toContain('> 추천 인용문');
    });
  });
});

describe('buildProductMarkdown', () => {
  it('상품 정보와 canonical URL을 올바른 마크다운으로 구성한다', () => {
    const md = buildProductMarkdown({
      locale: 'ko',
      product: {
        name: '노션 (Notion)',
        slug: 'notion',
        summary: '올인원 생산성 도구',
        description: '<p>노션은 문서 작성을 돕습니다.</p>',
        publishedAt: new Date('2026-01-01T00:00:00Z'),
        features: [{ name: '위키 기능', emoji: '📚', summary: '팀 문서를 관리합니다.' }],
        company: {
          name: 'Notion Labs, Inc.',
          websiteUrl: 'https://www.notion.so',
        },
        links: [{ title: '공식 웹사이트', url: 'https://www.notion.so' }],
      },
      alternatives: [{ name: '옵시디언', slug: 'obsidian', summary: '로컬 기반 지식 관리' }],
    });

    expect(md).toContain('# 노션 \\(Notion\\)');
    expect(md).toContain('Canonical URL: https://www.darun.io/ko/products/notion');
    expect(md).toContain('## 서비스 소개');
    expect(md).toContain('## 주요 기능');
    expect(md).toContain('📚 **위키 기능**: 팀 문서를 관리합니다.');
    expect(md).toContain('## 대안 서비스');
    expect(md).toContain('[옵시디언](https://www.darun.io/ko/products/obsidian)');
    expect(md).toContain('## 회사 정보');
    expect(md).toContain('https://www.notion.so');
    expect(md).toContain('## 외부 서비스 링크');
    expect(md).toContain('최종 수정');
  });
});

describe('buildProductAlternativesMarkdown', () => {
  it('대안 서비스 목록과 canonical URL을 생성한다', () => {
    const md = buildProductAlternativesMarkdown({
      locale: 'en',
      product: { name: 'Figma', slug: 'figma' },
      alternatives: [{ name: 'Penpot', slug: 'penpot', summary: 'Open source design' }],
    });

    expect(md).toContain('# Alternatives to Figma');
    expect(md).toContain('Canonical URL: https://www.darun.io/en/products/figma/alternatives');
    expect(md).toContain('[Penpot](https://www.darun.io/en/products/penpot)');
  });
});

describe('buildCategoryMarkdown', () => {
  it('카테고리 서비스 목록과 canonical URL을 생성한다', () => {
    const md = buildCategoryMarkdown({
      locale: 'ko',
      category: { slug: 'productivity', label: '생산성' },
      products: [{ name: '노션', slug: 'notion', summary: '협업 툴' }],
    });

    expect(md).toContain('# 생산성');
    expect(md).toContain('Canonical URL: https://www.darun.io/ko/categories/productivity');
    expect(md).toContain('[노션](https://www.darun.io/ko/products/notion)');
  });
});

describe('buildRankingMarkdown', () => {
  it('순위 목록과 canonical URL을 생성한다', () => {
    const md = buildRankingMarkdown({
      locale: 'ko',
      products: [
        { name: '서비스 1', slug: 'service-1', summary: '첫번째' },
        { name: '서비스 2', slug: 'service-2', summary: '두번째' },
      ],
    });

    expect(md).toContain('# 인기 서비스 순위');
    expect(md).toContain('Canonical URL: https://www.darun.io/ko/ranking');
    expect(md).toContain('1. [서비스 1](https://www.darun.io/ko/products/service-1)');
    expect(md).toContain('2. [서비스 2](https://www.darun.io/ko/products/service-2)');
  });
});

describe('buildHomeMarkdown', () => {
  it('홈페이지 마크다운을 올바르게 생성한다', () => {
    const md = buildHomeMarkdown({
      locale: 'ko',
      categories: [{ slug: 'ai', label: '인공지능' }],
      featuredProducts: [{ slug: 'chatgpt', name: 'ChatGPT', summary: '대화형 AI' }],
    });

    expect(md).toContain('# 다른(darun)');
    expect(md).toContain('https://www.darun.io/ko');
    expect(md).toContain('[인공지능](https://www.darun.io/ko/categories/ai)');
    expect(md).toContain('[ChatGPT](https://www.darun.io/ko/products/chatgpt)');
    expect(md).toContain('https://www.darun.io/ko/about');
  });
});

describe('buildCompareMarkdown', () => {
  it('두 상품의 비교 마크다운을 생성한다', () => {
    const md = buildCompareMarkdown({
      locale: 'ko',
      product1: { name: '노션', slug: 'notion', summary: '협업 툴' },
      product2: { name: '피그마', slug: 'figma', summary: '디자인 툴' },
    });

    expect(md).toContain('# 노션 vs 피그마');
    expect(md).toContain('Canonical URL: https://www.darun.io/ko/compare/notion/figma');
    expect(md).toContain('https://www.darun.io/ko/products/notion');
    expect(md).toContain('https://www.darun.io/ko/products/figma');
  });
});

describe('buildMagazineMarkdown', () => {
  it('매거진 글 마크다운을 생성한다', () => {
    const md = buildMagazineMarkdown({
      magazine: {
        title: '2026 AI 트렌드',
        slug: 'ai-trends-2026',
        body: '<p>올해의 주요 변화입니다.</p>',
        authorName: '홍길동',
        publishedAt: '2026-01-01T00:00:00Z',
      },
    });

    expect(md).toContain('# 2026 AI 트렌드');
    expect(md).toContain('Canonical URL: https://www.darun.io/ko/magazines/ai-trends-2026');
    expect(md).toContain('Author: 홍길동');
    expect(md).toContain('올해의 주요 변화입니다.');
  });
});

describe('buildNotFoundMarkdown', () => {
  it('404 안내와 복구 링크(홈, 검색, 사이트맵, llms.txt)를 제공한다', () => {
    const md = buildNotFoundMarkdown({ locale: 'ko' });

    expect(md).toContain('# 페이지를 찾을 수 없습니다');
    expect(md).toContain('https://www.darun.io/ko');
    expect(md).toContain('https://www.darun.io/ko/search/product');
    expect(md).toContain('https://www.darun.io/ko/sitemap.xml');
    expect(md).toContain('https://www.darun.io/ko/llms.txt');
  });
});
