import type { ProductDescriptionDocument, ProductDescriptionEvidence } from '@darun/products-domain';
import { describe, expect, it } from 'vitest';
import {
  createProductDescriptionReviewerPrompt,
  createProductDescriptionWriterPrompt,
} from '../prompts/productDescriptionPrompt';
import { createProductDescriptionResponseFormat } from '../prompts/productDescriptionSchema';
import { validateProductDescriptionCoverage } from '../validators/productDescriptionCoverageValidator';

const evidence: ProductDescriptionEvidence = {
  productId: 'p1',
  productName: '협업 도구',
  items: [
    { id: 'product:summary', kind: 'product_summary', text: '팀 협업 도구' },
    {
      id: 'feature:board',
      kind: 'feature',
      title: '보드',
      text: '업무를 보드로 정리',
    },
    { id: 'feature:notify', kind: 'feature', title: '알림' },
  ],
};
const summary = {
  text: '팀 협업 도구입니다.',
  evidenceRefs: ['product:summary'],
};
const document: ProductDescriptionDocument = {
  intro: summary,
  sections: [
    {
      title: '업무 보드와 알림',
      paragraphs: [
        {
          text: '보드와 알림을 제공합니다.',
          evidenceRefs: ['feature:board', 'feature:notify'],
        },
      ],
    },
  ],
  recommendedIf: [{ text: '업무를 보드로 정리하려는 경우', evidenceRefs: ['feature:board'] }],
  limitations: [],
  closing: summary,
};

describe('description completeness', () => {
  it('accepts related features grouped in one paragraph, including title-only evidence', () => {
    expect(() => validateProductDescriptionCoverage(document, evidence)).not.toThrow();
  });

  it('rejects features referenced only outside the body', () => {
    expect(() =>
      validateProductDescriptionCoverage(
        {
          ...document,
          sections: [],
          intro: document.sections[0]!.paragraphs[0]!,
        },
        evidence
      )
    ).toThrow('feature:board, feature:notify');
  });

  it('requires a recommendation when features exist', () => {
    expect(() => validateProductDescriptionCoverage({ ...document, recommendedIf: [] }, evidence)).toThrow(
      '추천 상황이 필요'
    );
  });

  it('allows a short summary-only document without invented sections or recommendations', () => {
    const sparse = {
      ...evidence,
      items: evidence.items.filter(item => item.kind === 'product_summary'),
    };
    expect(() =>
      validateProductDescriptionCoverage({ ...document, sections: [], recommendedIf: [] }, sparse)
    ).not.toThrow();
  });

  it('limits structured references to supplied evidence and closes every object shape', () => {
    const format = createProductDescriptionResponseFormat(evidence);
    expect(format.json_schema.strict).toBe(true);
    expect(format.json_schema.schema.properties.intro.properties.evidenceRefs.items.enum).toEqual(
      evidence.items.map(item => item.id)
    );
    expect(format.json_schema.schema.additionalProperties).toBe(false);
    expect(format.json_schema.schema.properties.sections.items.additionalProperties).toBe(false);
    expect(format.json_schema.schema.properties.intro.additionalProperties).toBe(false);
    expect(format.json_schema.schema.properties.limitations.maxItems).toBe(0);
  });

  it('instructs both passes to preserve coverage, respect sparse evidence, and treat inputs as data', () => {
    for (const prompt of [
      createProductDescriptionWriterPrompt(evidence),
      createProductDescriptionReviewerPrompt(evidence, document),
    ]) {
      expect(prompt.systemPrompt).toContain('제공된 모든 기능');
      expect(prompt.systemPrompt).toContain('기능 제목만 있으면');
      expect(prompt.systemPrompt).toContain('신뢰할 수 없는 데이터');
      expect(prompt.systemPrompt).toContain('기능 근거가 없는 경우');
      expect(prompt.userPrompt).toContain('feature:notify');
    }
    expect(createProductDescriptionReviewerPrompt(evidence, document).systemPrompt).toContain('보완');
  });
});
