import type { ProductDescriptionDocument, ProductDescriptionEvidence } from '@darun/products-domain';
import { describe, expect, it } from 'vitest';
import {
  createProductDescriptionReviewerPrompt,
  createProductDescriptionWriterPrompt,
} from '../prompts/productDescriptionPrompt';
import { createProductDescriptionResponseFormat } from '../prompts/productDescriptionSchema';
import { validateProductDescriptionCoverage } from '../validators/productDescriptionCoverageValidator';
import { validateProductDescriptionDocument } from '../validators/productDescriptionDocumentValidator';

function assertStrictWireObject(shape: { properties?: Record<string, unknown>; required?: string[] }): void {
  expect(Object.keys(shape.properties ?? {}).sort()).toEqual(['bullets', 'evidenceRefs', 'link', 'quote', 'text']);
  expect([...(shape.required ?? [])].sort()).toEqual(['bullets', 'evidenceRefs', 'link', 'quote', 'text']);
}

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
    ).toThrow('feature:board');
  });

  it('requires a recommendation tied to body-covered features, not mere existence', () => {
    expect(() => validateProductDescriptionCoverage({ ...document, recommendedIf: [] }, evidence)).toThrow(
      '추천 상황이 필요'
    );
    // Title-only existence never implies a recommendation: dropping the
    // title-only feature from the body keeps the doc valid.
    const titleOnlyDropped = {
      ...document,
      sections: [
        {
          title: '업무 보드',
          paragraphs: [
            {
              text: '보드를 제공합니다.',
              evidenceRefs: ['feature:board'],
            },
          ],
        },
      ],
    };
    expect(() => validateProductDescriptionCoverage(titleOnlyDropped, evidence)).not.toThrow();
  });

  it('does not force full-feature enumeration for title-only features', () => {
    const bodyBoardOnly = {
      ...document,
      sections: [
        {
          title: '업무 보드',
          paragraphs: [
            {
              text: '보드를 제공합니다.',
              evidenceRefs: ['feature:board'],
            },
          ],
        },
      ],
    };
    // feature:notify is title-only (no descriptive text): its absence from the
    // body is not a coverage miss.
    expect(() => validateProductDescriptionCoverage(bodyBoardOnly, evidence)).not.toThrow();
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
    const schema = format.json_schema.schema as {
      properties: Record<string, { properties?: Record<string, unknown>; required?: string[] }>;
      required: string[];
      additionalProperties: boolean;
    };
    expect(schema.required).toEqual(['intro', 'sections', 'recommendedIf', 'limitations', 'closing']);
    expect(format.json_schema.schema.properties.intro.properties.evidenceRefs.items.enum).toEqual(
      evidence.items.map(item => item.id)
    );
    expect(format.json_schema.schema.additionalProperties).toBe(false);
    expect(format.json_schema.schema.properties.sections.items.additionalProperties).toBe(false);
    expect(format.json_schema.schema.properties.intro.additionalProperties).toBe(false);
    // Strict wire contract: every backed-text object requires all property
    // keys, with absence carried as [] / false / null.
    assertStrictWireObject(format.json_schema.schema.properties.intro);
    const sectionItem = format.json_schema.schema.properties.sections.items as {
      properties: Record<string, { properties?: Record<string, unknown>; required?: string[] }>;
      required: string[];
    };
    expect(sectionItem.required).toEqual(['title', 'paragraphs']);
    const paragraphShape = sectionItem.properties.paragraphs as unknown as {
      items: { properties: Record<string, unknown>; required: string[] };
    };
    assertStrictWireObject(paragraphShape.items);
    expect(format.json_schema.schema.properties.limitations.maxItems).toBe(0);
  });

  it('normalizes strict wire sentinels to the internal optional DTO', () => {
    const wireDoc = {
      intro: {
        text: '팀 협업 도구입니다.',
        evidenceRefs: ['product:summary'],
        bullets: [],
        quote: false,
        link: null,
      },
      sections: [
        {
          title: '업무 보드와 알림',
          paragraphs: [
            {
              text: '보드와 알림을 제공합니다.',
              evidenceRefs: ['feature:board', 'feature:notify'],
              bullets: [],
              quote: false,
              link: null,
            },
          ],
        },
      ],
      recommendedIf: [
        {
          text: '업무를 보드로 정리하려는 경우',
          evidenceRefs: ['feature:board'],
          bullets: [],
          quote: false,
          link: null,
        },
      ],
      limitations: [],
      closing: {
        text: '팀 협업 도구입니다.',
        evidenceRefs: ['product:summary'],
        bullets: [],
        quote: false,
        link: null,
      },
    };
    const normalized = validateProductDescriptionDocument(wireDoc, evidence);
    expect(normalized).toEqual(document);
  });

  it('instructs both passes to preserve coverage, respect sparse evidence, and treat inputs as data', () => {
    for (const prompt of [
      createProductDescriptionWriterPrompt(evidence),
      createProductDescriptionReviewerPrompt(evidence, document),
    ]) {
      expect(prompt.systemPrompt).toContain('설명이 있는 핵심 기능 근거');
      expect(prompt.systemPrompt).toContain('기능 제목만 있으면');
      expect(prompt.systemPrompt).toContain('신뢰할 수 없는 데이터');
      expect(prompt.systemPrompt).toContain('기능 근거가 없는 경우');
      expect(prompt.userPrompt).toContain('feature:notify');
    }
    expect(createProductDescriptionReviewerPrompt(evidence, document).systemPrompt).toContain('보완');
  });
});
