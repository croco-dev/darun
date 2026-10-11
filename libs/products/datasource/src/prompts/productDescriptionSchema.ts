import type { ProductDescriptionEvidence } from '@darun/products-domain';

export function createProductDescriptionResponseFormat(evidence: ProductDescriptionEvidence) {
  const backedText = {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: '근거 범위 안에서 작성한 한국어 설명. HTML 없이 일반 텍스트로 작성합니다.',
      },
      evidenceRefs: {
        type: 'array',
        items: { type: 'string', enum: evidence.items.map(item => item.id) },
        minItems: 1,
        description: '이 설명을 직접 뒷받침하는 제공된 근거 ID입니다.',
      },
    },
    required: ['text', 'evidenceRefs'],
    additionalProperties: false,
  };

  return {
    type: 'json_schema' as const,
    json_schema: {
      name: 'product_description',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          intro: {
            ...backedText,
            description: '서비스 이름, 해결하는 문제, 핵심 역할을 소개합니다.',
          },
          sections: {
            type: 'array',
            maxItems: 3,
            description: '관련 기능을 묶어 모든 제공된 기능을 설명하는 본문입니다. 기능 목록만 반복하지 않습니다.',
            items: {
              type: 'object',
              properties: {
                title: {
                  type: 'string',
                  description: '구체적인 기능이나 사용 목적을 나타내는 제목입니다.',
                },
                paragraphs: {
                  type: 'array',
                  items: backedText,
                  minItems: 1,
                  maxItems: 2,
                },
              },
              required: ['title', 'paragraphs'],
              additionalProperties: false,
            },
          },
          recommendedIf: {
            type: 'array',
            items: backedText,
            maxItems: 3,
            description: '확인된 기능이 필요한 구체적인 상황과 해당 기능을 연결합니다.',
          },
          limitations: { type: 'array', items: backedText, maxItems: 0 },
          closing: {
            ...backedText,
            description: '도입을 반복하지 않고 핵심 사용 목적을 한 문장으로 정리합니다.',
          },
        },
        required: ['intro', 'sections', 'recommendedIf', 'limitations', 'closing'],
        additionalProperties: false,
      },
    },
  };
}
