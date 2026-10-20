import { renderProductDescriptionDocument } from '@darun/products-datasource';
import type { ProductDescriptionDocument } from '@darun/products-domain';
import { Editor } from '@tiptap/core';
import { describe, expect, it } from 'vitest';
import { createAdminEditorExtensions } from '../Editor/extensions';

const richDoc: ProductDescriptionDocument = {
  intro: { text: '토스는 간편한 금융 서비스입니다.', evidenceRefs: ['product:summary'] },
  sections: [
    {
      title: '무료 송금 기능',
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
  recommendedIf: [{ text: '간편 송금을 자주 쓰는 사람에게 유용합니다.', evidenceRefs: ['feature:feat-1'] }],
  limitations: [],
  closing: { text: '일상 금융 업무를 돕는 서비스입니다.', evidenceRefs: ['product:summary'] },
};

describe('admin editor rich schema round-trip', () => {
  it('preserves h2/list/link/blockquote semantics for rendered candidate HTML', () => {
    const html = renderProductDescriptionDocument(richDoc, new Date('2026-09-27T12:00:00Z'));
    const editor = new Editor({ extensions: createAdminEditorExtensions(), content: html });
    try {
      const roundTripped = editor.getHTML();
      const doc = new DOMParser().parseFromString(roundTripped, 'text/html');
      expect(doc.querySelector('h2')?.textContent).toBe('무료 송금 기능');
      expect(doc.querySelector('blockquote p')?.textContent).toContain('수수료 없는 송금을 지원합니다.');
      const listItems = [...doc.querySelectorAll('ul li')].map(li => li.textContent);
      expect(listItems).toEqual(expect.arrayContaining(['주말에도 송금 가능', '받는 사람 계좌 확인 가능']));
      const anchor = doc.querySelector('a[href="https://example.com/guide"]');
      expect(anchor?.textContent).toBe('공식 안내');
    } finally {
      editor.destroy();
    }
  });

  it('keeps legacy v1 candidate HTML readable by the editor', () => {
    const storedV1Html = '<h3>구 소개 제목</h3><p>구 렌더러로 만든 후보</p><p><em>2026년 9월 - Editor. DAO</em></p>';
    const editor = new Editor({ extensions: createAdminEditorExtensions(), content: storedV1Html });
    try {
      const doc = new DOMParser().parseFromString(editor.getHTML(), 'text/html');
      expect(doc.querySelector('h3')?.textContent).toBe('구 소개 제목');
      expect(doc.body.textContent).toContain('구 렌더러로 만든 후보');
      expect(storedV1Html).toBe(
        '<h3>구 소개 제목</h3><p>구 렌더러로 만든 후보</p><p><em>2026년 9월 - Editor. DAO</em></p>'
      );
    } finally {
      editor.destroy();
    }
  });
});
