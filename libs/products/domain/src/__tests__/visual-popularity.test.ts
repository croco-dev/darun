import { describe, expect, it } from 'vitest';
import {
  VISUAL_POPULARITY_DECAY_DAYS,
  visualPopularityScore,
} from '../usecases/VisualPopularity';

describe('visualPopularityScore', () => {
  it('v30/saves가 0이면 조회·저장 기여 없이 감쇠만 남는다', () => {
    expect(visualPopularityScore({ views30d: 0, saves: 0, ageDays: 0 })).toBe(0);
  });

  it('공식을 그대로 계산한다', () => {
    const expected =
      (Math.log1p(10) + Math.log1p(9 * 2) * 3.0) * (0.5 + 0.5 * Math.exp(-30 / VISUAL_POPULARITY_DECAY_DAYS));
    expect(visualPopularityScore({ views30d: 10, saves: 2, ageDays: 30 })).toBeCloseTo(expected, 10);
  });

  it('오래된 항목은 신선한 항목보다 점수가 낮다', () => {
    const fresh = visualPopularityScore({ views30d: 10, saves: 2, ageDays: 0 });
    const old = visualPopularityScore({ views30d: 10, saves: 2, ageDays: 365 });
    expect(fresh).toBeGreaterThan(old);
    expect(old).toBeGreaterThan(fresh * 0.5);
  });

  it('음수는 0으로 clamp한다', () => {
    expect(visualPopularityScore({ views30d: -5, saves: -3, ageDays: -1 })).toBe(0);
  });
});
