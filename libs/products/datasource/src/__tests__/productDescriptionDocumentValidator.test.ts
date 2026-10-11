import type { ProductDescriptionEvidence } from '@darun/products-domain';
import { describe, expect, it } from 'vitest';
import { validateProductDescriptionDocument } from '../validators/productDescriptionDocumentValidator';

describe('productDescriptionDocumentValidator', () => {
  const mockEvidence: ProductDescriptionEvidence = {
    productId: 'prod-1',
    productName: '토스',
    items: [
      { id: 'product:summary', kind: 'product_summary', text: '간편 송금 서비스' },
      { id: 'category:cat-1', kind: 'category', text: '핀테크' },
      { id: 'feature:feat-1', kind: 'feature', title: '송금', text: '무료 송금' },
      {
        id: 'link:link-1',
        kind: 'link',
        title: '공식 안내',
        url: 'https://example.com/guide',
        displayText: '공식 안내',
      },
    ],
  };

  const validDoc = {
    intro: {
      text: '토스는 간편한 금융 경험을 제공하는 서비스입니다.',
      evidenceRefs: ['product:summary'],
    },
    sections: [
      {
        title: '무료 송금 기능',
        paragraphs: [
          {
            text: '수수료 없이 언제 어디서나 송금할 수 있습니다.',
            evidenceRefs: ['feature:feat-1'],
          },
        ],
      },
    ],
    recommendedIf: [
      {
        text: '간편하게 송금하고 싶은 사용자에게 유용합니다.',
        evidenceRefs: ['feature:feat-1'],
      },
    ],
    limitations: [],
    closing: {
      text: '일상적인 금융 업무를 편리하게 돕는 서비스입니다.',
      evidenceRefs: ['product:summary'],
    },
  };

  it('validates and returns a clean document when valid', () => {
    const result = validateProductDescriptionDocument(validDoc, mockEvidence);
    expect(result.intro.text).toBe(validDoc.intro.text);
    expect(result.sections).toHaveLength(1);
    expect(result.recommendedIf).toHaveLength(1);
    expect(result.limitations).toEqual([]);
    expect(result.closing.text).toBe(validDoc.closing.text);
  });

  it('rejects document when limitations is not an empty array', () => {
    const invalid = {
      ...validDoc,
      limitations: [{ text: '단점', evidenceRefs: ['product:summary'] }],
    };
    expect(() => validateProductDescriptionDocument(invalid, mockEvidence)).toThrow(
      '자동 생성에서 limitations는 반드시 빈 배열이어야 합니다.'
    );
  });

  it('rejects unknown top-level keys', () => {
    const invalid = {
      ...validDoc,
      extraKey: 'unexpected',
    };
    expect(() => validateProductDescriptionDocument(invalid, mockEvidence)).toThrow(
      '허용되지 않은 최상위 필드가 포함되어 있습니다: extraKey'
    );
  });

  it('rejects unknown evidenceRefs', () => {
    const invalid = {
      ...validDoc,
      intro: {
        text: '도입부',
        evidenceRefs: ['non-existent-id'],
      },
    };
    expect(() => validateProductDescriptionDocument(invalid, mockEvidence)).toThrow(
      '존재하지 않는 근거 ID가 포함되어 있습니다: "non-existent-id"'
    );
  });

  it('rejects recommendedIf when it relies solely on category ref', () => {
    const invalid = {
      ...validDoc,
      recommendedIf: [
        {
          text: '핀테크를 찾는 분들에게 좋습니다.',
          evidenceRefs: ['category:cat-1'],
        },
      ],
    };
    expect(() => validateProductDescriptionDocument(invalid, mockEvidence)).toThrow(
      'category, tag, link, screenshot만으로 작성될 수 없으며'
    );
  });

  it('rejects section paragraph when it relies solely on category ref', () => {
    const invalid = {
      ...validDoc,
      sections: [
        {
          title: '섹션',
          paragraphs: [
            {
              text: '핀테크 서비스 설명입니다.',
              evidenceRefs: ['category:cat-1'],
            },
          ],
        },
      ],
    };
    expect(() => validateProductDescriptionDocument(invalid, mockEvidence)).toThrow(
      'category, tag, link, screenshot만으로 작성될 수 없으며'
    );
  });

  it('accepts flow and research refs as substantive body evidence', () => {
    const flowEvidence: ProductDescriptionEvidence = {
      ...mockEvidence,
      items: [
        ...mockEvidence.items,
        {
          id: 'flow:flow-1',
          kind: 'flow',
          title: '송금 흐름',
          description: '송금 흐름 설명',
          platform: 'iOS',
          stepCount: 2,
          stepCaptions: ['계좌 선택', '금액 입력'],
        },
      ],
    };
    const doc = {
      ...validDoc,
      sections: [
        {
          title: '송금 흐름',
          paragraphs: [
            {
              text: '확인된 단계에 따라 송금을 진행합니다.',
              evidenceRefs: ['flow:flow-1'],
            },
          ],
        },
      ],
    };
    expect(() => validateProductDescriptionDocument(doc, flowEvidence)).not.toThrow();
  });

  it('accepts rich bullets, quotes, and evidence-bound links', () => {    const doc = {
      ...validDoc,
      sections: [
        {
          title: '송금 안내',
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
    const result = validateProductDescriptionDocument(doc, mockEvidence);
    expect(result.sections[0]?.paragraphs[0]?.bullets).toHaveLength(2);
    expect(result.sections[0]?.paragraphs[0]?.quote).toBe(true);
    expect(result.sections[0]?.paragraphs[0]?.link?.url).toBe('https://example.com/guide');
  });

  it('rejects inline HTML or Markdown in rich text fields', () => {
    const htmlDoc = {
      ...validDoc,
      intro: { text: '<b>강조된 소개</b>', evidenceRefs: ['product:summary'] },
    };
    expect(() => validateProductDescriptionDocument(htmlDoc, mockEvidence)).toThrow('HTML 태그를 직접 쓸 수 없습니다');

    const markdownCases = [
      '**강조된 소개**',
      '__강조된 소개__',
      '`강조된 소개`',
      '자세한 내용은 [공식 안내](https://example.com/guide)를 보세요',
    ];
    for (const text of markdownCases) {
      const markdownDoc = {
        ...validDoc,
        intro: { text, evidenceRefs: ['product:summary'] },
      };
      expect(() => validateProductDescriptionDocument(markdownDoc, mockEvidence)).toThrow(
        'Markdown 서식을 쓸 수 없습니다'
      );
    }

    const bracketOnlyDoc = {
      ...validDoc,
      intro: { text: '대괄호 [메모] 정도만 있는 소개', evidenceRefs: ['product:summary'] },
    };
    expect(() => validateProductDescriptionDocument(bracketOnlyDoc, mockEvidence)).not.toThrow();
  });

  it('rejects links without cited link or research evidence', () => {
    const doc = {
      ...validDoc,
      sections: [
        {
          title: '송금 안내',
          paragraphs: [
            {
              text: '자세한 안내는 링크를 확인하십시오.',
              evidenceRefs: ['feature:feat-1'],
              link: { label: '공식 안내', url: 'https://example.com/guide' },
            },
          ],
        },
      ],
    };
    expect(() => validateProductDescriptionDocument(doc, mockEvidence)).toThrow(
      'link:* 또는 research:* 근거를 evidenceRefs에 포함해야 합니다'
    );
  });

  it('rejects links whose URL does not match cited link evidence', () => {
    const doc = {
      ...validDoc,
      sections: [
        {
          title: '송금 안내',
          paragraphs: [
            {
              text: '자세한 안내는 링크를 확인하십시오.',
              evidenceRefs: ['feature:feat-1', 'link:link-1'],
              link: { label: '공식 안내', url: 'https://evil.example/other' },
            },
          ],
        },
      ],
    };
    expect(() => validateProductDescriptionDocument(doc, mockEvidence)).toThrow(
      '인용한 link 근거의 URL과 일치해야 합니다'
    );
  });

  it('rejects research-bound links whose URL does not match cited research evidence', () => {
    const researchEvidence: ProductDescriptionEvidence = {
      ...mockEvidence,
      items: [
        ...mockEvidence.items,
        {
          id: 'research:src-1',
          kind: 'research',
          title: '공식 안내',
          snippet: '수수료 없는 송금을 지원합니다.',
          hostname: 'example.com',
          url: 'https://example.com/guide',
        },
      ],
    };
    const doc = {
      ...validDoc,
      sections: [
        {
          title: '송금 안내',
          paragraphs: [
            {
              text: '외부 안내를 확인하십시오.',
              evidenceRefs: ['feature:feat-1', 'research:src-1'],
              link: { label: '외부 안내', url: 'https://evil.example/other' },
            },
          ],
        },
      ],
    };
    expect(() => validateProductDescriptionDocument(doc, researchEvidence)).toThrow(
      '인용한 research 근거의 URL과 일치해야 합니다'
    );
  });

  it('rejects when text exceeds length limit', () => {
    const invalid = {
      ...validDoc,
      intro: {
        text: 'a'.repeat(601),
        evidenceRefs: ['product:summary'],
      },
    };
    expect(() => validateProductDescriptionDocument(invalid, mockEvidence)).toThrow(
      '길이가 제한(600자)을 초과했습니다.'
    );
  });

  it('rejects when sections exceed 3', () => {
    const invalid = {
      ...validDoc,
      sections: [
        { title: 'S1', paragraphs: [{ text: 'P1', evidenceRefs: ['feature:feat-1'] }] },
        { title: 'S2', paragraphs: [{ text: 'P2', evidenceRefs: ['feature:feat-1'] }] },
        { title: 'S3', paragraphs: [{ text: 'P3', evidenceRefs: ['feature:feat-1'] }] },
        { title: 'S4', paragraphs: [{ text: 'P4', evidenceRefs: ['feature:feat-1'] }] },
      ],
    };
    expect(() => validateProductDescriptionDocument(invalid, mockEvidence)).toThrow(
      'sections 개수는 최대 3개까지 허용됩니다.'
    );
  });
});
