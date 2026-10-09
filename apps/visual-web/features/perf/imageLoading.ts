// Visual 이미지 로딩 정책 (P4).
// - 목록·서제스트 카드 이미지는 전부 lazy.
// - 상세 첫 이미지(LCP 후보)는 fetchPriority high.
export const VISUAL_CARD_IMAGE_LOADING = 'lazy' as const;
export const VISUAL_DETAIL_IMAGE_FETCH_PRIORITY = 'high' as const;
