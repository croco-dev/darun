import type { ProductDescriptionDocument } from '@darun/products-domain';
import { describe, expect, it } from 'vitest';
import {
  escapeHtml,
  formatEditorByline,
  renderProductDescriptionDocument,
} from '../services/ProductDescriptionRenderer';

describe('ProductDescriptionRenderer', () => {
  const sampleDoc: ProductDescriptionDocument = {
    intro: {
      text: '토스는 간편한 금융 서비스 & 결제 앱입니다.',
      evidenceRefs: ['product:summary'],
    },
    sections: [
      {
        title: '송금 <기능>',
        paragraphs: [
          {
            text: '<script>alert("xss")</script> 안전한 송금 제공',
            evidenceRefs: ['feature:feat-1'],
          },
        ],
      },
    ],
    recommendedIf: [
      {
        text: '간편 송금을 "자주" 쓰는 사람',
        evidenceRefs: ['feature:feat-1'],
      },
    ],
    limitations: [],
    closing: {
      text: '유용한 앱입니다.',
      evidenceRefs: ['product:summary'],
    },
  };

  it('escapes text properly and prevents script injection', () => {
    expect(escapeHtml('<script>alert("xss")</script> & "quotes"')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; &quot;quotes&quot;'
    );
  });

  it('renders deterministic HTML with escaped content and single byline', () => {
    const fixedDate = new Date('2026-09-27T12:00:00Z');
    const html = renderProductDescriptionDocument(sampleDoc, fixedDate);

    expect(html).toContain('<p>토스는 간편한 금융 서비스 &amp; 결제 앱입니다.</p>');
    expect(html).toContain('<h2>송금 &lt;기능&gt;</h2>');
    expect(html).toContain('<p>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; 안전한 송금 제공</p>');
    expect(html).toContain('<li>간편 송금을 &quot;자주&quot; 쓰는 사람</li>');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('아쉽다면');
    expect(html).not.toContain('limitations');

    const bylineCount = (html.match(/Editor\. DAO/g) || []).length;
    expect(bylineCount).toBe(1);
    expect(html).toContain('<p><em>2026년 9월 - Editor. DAO</em></p>');
  });

  it('renders rich blocks with bullets, quotes, and evidence-bound links', () => {
    const richDoc: ProductDescriptionDocument = {
      ...sampleDoc,
      sections: [
        {
          title: '송금 기능',
          paragraphs: [
            {
              text: '수수료 없는 송금을 지원합니다.',
              evidenceRefs: ['feature:feat-1', 'link:link-1'],
              bullets: ['주말에도 송금 가능', '받는 사람 계좌 확인 가능'],
              quote: true,
              link: { label: '공식 안내', url: 'https://example.com/guide' },
            },
          ],
        },
      ],
    };
    const html = renderProductDescriptionDocument(richDoc, new Date('2026-09-27T12:00:00Z'));

    expect(html).toContain('<blockquote><p>수수료 없는 송금을 지원합니다.');
    expect(html).toContain(
      '<a href="https://example.com/guide" target="_blank" rel="noopener noreferrer">공식 안내</a>'
    );
    expect(html).toContain('<ul><li>주말에도 송금 가능</li><li>받는 사람 계좌 확인 가능</li></ul>');
    expect(html).not.toContain('<h3>');
    expect(html).not.toContain('<script>');
  });

  it('omits recommendedIf section when recommendedIf is empty', () => {
    const docWithoutRec: ProductDescriptionDocument = {
      ...sampleDoc,
      recommendedIf: [],
    };
    const html = renderProductDescriptionDocument(docWithoutRec);
    expect(html).not.toContain('추천한다면 -');
    expect(html).not.toContain('<ul>');
  });

  it('formats byline in Asia/Seoul timezone consistently', () => {
    // 2026-09-30 23:30 UTC is 2026-10-01 08:30 in Asia/Seoul
    const endOfSeptemberUtc = new Date('2026-09-30T23:30:00Z');
    const byline = formatEditorByline(endOfSeptemberUtc);
    expect(byline).toBe('2026년 10월 - Editor. DAO');
  });
});
