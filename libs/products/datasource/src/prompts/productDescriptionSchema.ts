import {
  MAX_INTRO_LENGTH,
  MAX_CLOSING_LENGTH,
  MAX_PARAGRAPH_LENGTH,
  MAX_SECTION_TITLE_LENGTH,
  MAX_RECOMMENDED_LENGTH,
  MAX_SECTIONS,
  MAX_PARAGRAPHS_PER_SECTION,
  MAX_RECOMMENDED_ITEMS,
  MAX_EVIDENCE_BULLETS,
  MAX_EVIDENCE_BULLET_LENGTH,
  type ProductDescriptionEvidence,
} from '@darun/products-domain';

export function createProductDescriptionResponseFormat(evidence: ProductDescriptionEvidence) {
  const backedText = (maxLength: number) => ({
    type: 'object',
    properties: {
      text: {
        type: 'string',
        minLength: 1,
        maxLength,
        description: '근거 범위 안에서 작성한 한국어 설명. HTML과 Markdown 없이 작성합니다.',
      },
      evidenceRefs: {
        type: 'array',
        items: { type: 'string', enum: evidence.items.map(item => item.id) },
        minItems: 1,
        description: '설명을 직접 뒷받침하는 근거 ID. ID 존재는 사실성 인증이 아닙니다.',
      },
      bullets: {
        type: 'array',
        items: {
          type: 'string',
          minLength: 1,
          maxLength: MAX_EVIDENCE_BULLET_LENGTH,
        },
        maxItems: MAX_EVIDENCE_BULLETS,
        description: '근거 있는 항목 목록. 필요 없으면 빈 배열입니다.',
      },
      quote: {
        type: 'boolean',
        enum: [false],
        description: '직접 인용을 입증하는 계약이 없으므로 항상 false입니다.',
      },
      link: {
        type: ['object', 'null'],
        properties: {
          label: {
            type: 'string',
            minLength: 1,
            description: 'HTML과 Markdown 없는 링크 문구.',
          },
          url: {
            type: 'string',
            minLength: 1,
            description: '인용한 link 또는 research 근거와 같은 공개 http(s) URL.',
          },
        },
        required: ['label', 'url'],
        additionalProperties: false,
        description: '링크가 없으면 null입니다.',
      },
    },
    required: ['text', 'evidenceRefs', 'bullets', 'quote', 'link'],
    additionalProperties: false,
  });

  return {
    type: 'json_schema' as const,
    json_schema: {
      name: 'product_description',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          intro: {
            ...backedText(MAX_INTRO_LENGTH),
            description: '서비스 이름과 핵심 역할을 소개합니다.',
          },
          sections: {
            type: 'array',
            maxItems: MAX_SECTIONS,
            description: '근거 안에서 대표 기능과 사용 목적을 설명합니다. 부족한 근거는 빈 배열을 허용합니다.',
            items: {
              type: 'object',
              properties: {
                title: {
                  type: 'string',
                  minLength: 1,
                  maxLength: MAX_SECTION_TITLE_LENGTH,
                },
                paragraphs: {
                  type: 'array',
                  items: backedText(MAX_PARAGRAPH_LENGTH),
                  minItems: 1,
                  maxItems: MAX_PARAGRAPHS_PER_SECTION,
                },
              },
              required: ['title', 'paragraphs'],
              additionalProperties: false,
            },
          },
          recommendedIf: {
            type: 'array',
            items: backedText(MAX_RECOMMENDED_LENGTH),
            maxItems: MAX_RECOMMENDED_ITEMS,
            description: '근거가 뒷받침하는 구체적 상황만 작성하며 비워도 됩니다.',
          },
          limitations: {
            type: 'array',
            items: backedText(MAX_PARAGRAPH_LENGTH),
            maxItems: 0,
          },
          closing: {
            ...backedText(MAX_CLOSING_LENGTH),
            description: '확인된 핵심 사용 목적을 한 문장으로 정리합니다.',
          },
        },
        required: ['intro', 'sections', 'recommendedIf', 'limitations', 'closing'],
        additionalProperties: false,
      },
    },
  };
}
