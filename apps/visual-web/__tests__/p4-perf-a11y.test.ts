import { describe, expect, it } from 'vitest';
import { VISUAL_CARD_IMAGE_LOADING, VISUAL_DETAIL_IMAGE_FETCH_PRIORITY } from '../features/perf/imageLoading';

describe('P4 visual image loading policy', () => {
  it('카드·서제스트 이미지는 lazy이다', () => {
    expect(VISUAL_CARD_IMAGE_LOADING).toBe('lazy');
  });

  it('상세 첫 이미지는 fetchPriority high이다', () => {
    expect(VISUAL_DETAIL_IMAGE_FETCH_PRIORITY).toBe('high');
  });
});
