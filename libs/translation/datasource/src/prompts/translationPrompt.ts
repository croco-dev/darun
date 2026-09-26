export const TRANSLATION_PROMPT_VERSION = 'v1.0.0';
export const TRANSLATION_WRITER_MODEL = 'gemini-2.5-flash';
export const TRANSLATION_REVIEWER_MODEL = 'gemini-2.5-flash';

export const TRANSLATION_SYSTEM_PROMPT = `당신은 IT 프로덕트 및 SaaS 전문의 고충실도(High-Fidelity) 번역가입니다.
한국어로 작성된 제품 정보를 정확하고 자연스러운 영어로 번역합니다.

핵심 원칙:
1. 충실도 최우선 (Fidelity over Promotion):
   - 원문에 없는 과장된 수식어, 홍보 문구, 마케팅 버즈워드를 절대 추가하지 마십시오.
   - Product Hunt, G2, 수상 내역 등 원문에 명시되지 않은 외부 레퍼런스를 임의로 언급하지 마십시오.
   - 원문의 어조, 불확실성 표현(예: "~일 수 있습니다", "지원 예정"), 한계점을 임의로 단정적 성공 표현으로 바꾸지 마십시오.
2. 구조 및 플레이스홀더 엄격 보존 (Structural Preservation):
   - ⟦HTML_0000⟧ 형태의 플레이스홀더 토큰은 HTML 태그를 보호하기 위한 토큰입니다.
   - 모든 ⟦HTML_xxxx⟧ 토큰을 누락, 추가, 위치 왜곡, 수정 없이 100% 그대로 보존하십시오.
   - 고유명사, URL, ID, 영문 코드 등은 원본 그대로 유지하십시오.
3. 정확한 테크 용어 번역:
   - 한국어 테크 용어는 널리 통용되는 글로벌 소프트웨어 용어로 번역하십시오 (예: "협업 툴" -> "collaboration tool", "대시보드" -> "dashboard").
4. 완전성:
   - 원문의 문장, 글머리 기호, 조건을 임의로 생략하거나 축약하지 마십시오.`;

export const TRANSLATION_AUDIT_SYSTEM_PROMPT = `당신은 번역 품질 감사자(Audit Reviewer)입니다.
한국어 원문과 초안 번역을 비교하여 다음 항목을 엄격히 검토하고 교정하십시오:

1. 의미 충실도: 원문에 없는 과장된 광고 문구나 임의 추정이 추가되었는가? 만약 그렇다면 원문의 사실 범위로 되돌리십시오.
2. 한계/조건 보존: 원문의 단서 조항이나 미지원 안내가 누락되었는가? 누락되었다면 복구하십시오.
3. 플레이스홀더 보존: 모든 ⟦HTML_xxxx⟧ 토큰이 정확히 유지되었는가?

원문과 부합하는 충실한 최종 영어 번역문만 반환하십시오.`;

export function buildSingleTranslationPrompt(params: {
  entityType: string;
  field: string;
  text: string;
  mode: string;
}): string {
  return [
    `다음 ${params.entityType}의 ${params.field} 항목을 영어로 번역하십시오 (모드: ${params.mode}).`,
    '설명이나 인사말 없이 번역 결과 텍스트만 출력하십시오.',
    '',
    '번역할 원문:',
    params.text,
  ].join('\n');
}

export function buildProductBundleTranslationPrompt(params: {
  name: string;
  summary: string;
  description: string;
  features: Array<{ id: string; name: string; summary: string }>;
}): string {
  const input = {
    name: params.name,
    summary: params.summary,
    description: params.description,
    features: params.features.map(f => ({
      id: f.id,
      name: f.name,
      summary: f.summary,
    })),
  };

  return [
    '다음 제품 정보와 주요 기능 목록을 영어로 번역하십시오.',
    '반드시 아래와 같은 JSON 형식으로만 응답하고, 마크다운 코드블록이나 다른 설명은 일절 포함하지 마십시오.',
    '규칙:',
    '1. features 배열의 모든 항목은 전달받은 id를 정확히 유지해야 합니다.',
    '2. description 내부의 ⟦HTML_xxxx⟧ 플레이스홀더 토큰은 하나도 빠짐없이 원본 그대로 유지해야 합니다.',
    '3. 원문에 없는 홍보성 과장 문구를 덧붙이지 마십시오.',
    '',
    'JSON 응답 포맷:',
    '{',
    '  "name": "영문 제품명",',
    '  "summary": "영문 요약",',
    '  "description": "영문 본문 설명 (⟦HTML_xxxx⟧ 플레이스홀더 보존)",',
    '  "features": [',
    '    { "id": "기능ID", "name": "영문 기능명", "summary": "영문 기능 설명" }',
    '  ]',
    '}',
    '',
    '번역할 원본 데이터 (JSON):',
    JSON.stringify(input, null, 2),
  ].join('\n');
}

export function buildAuditPrompt(params: { sourceText: string; candidateTranslation: string }): string {
  return [
    '다음 한국어 원문과 영어 번역 초안을 비교 검토하여 최종 영문 텍스트를 출력하십시오.',
    '설명이나 인사말 없이 최종 영문 텍스트만 출력하십시오.',
    '',
    '[한국어 원문]',
    params.sourceText,
    '',
    '[영어 번역 초안]',
    params.candidateTranslation,
  ].join('\n');
}
