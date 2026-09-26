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
      'category만으로 작성될 수 없으며 product:summary 또는 feature:* 근거가 포함되어야 합니다.'
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
      'category만으로 작성될 수 없으며 product:summary 또는 feature:* 근거가 포함되어야 합니다.'
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
