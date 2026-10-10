/**
 * Visual 인기순 점수 (M1).
 * 식: (ln(1+v30) + ln(1+9*saves)*3.0) * (0.5+0.5*exp(-ageDays/60))
 * - v30: 최근 30일 조회수(visual_view_events), saves: 저장 수(visual_saves), ageDays: 생성 후 경과일
 */
export const VISUAL_POPULARITY_SAVE_WEIGHT = 3.0;
export const VISUAL_POPULARITY_SAVE_SCALE = 9;
export const VISUAL_POPULARITY_DECAY_DAYS = 60;

export function visualPopularityScore(params: { views30d: number; saves: number; ageDays: number }): number {
  const { views30d, saves, ageDays } = params;
  const viewTerm = Math.log1p(Math.max(0, views30d));
  const saveTerm = Math.log1p(Math.max(0, saves) * VISUAL_POPULARITY_SAVE_SCALE) * VISUAL_POPULARITY_SAVE_WEIGHT;
  const decay = 0.5 + 0.5 * Math.exp(-Math.max(0, ageDays) / VISUAL_POPULARITY_DECAY_DAYS);
  return (viewTerm + saveTerm) * decay;
}
