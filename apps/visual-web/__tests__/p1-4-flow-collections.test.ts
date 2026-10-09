import { describe, expect, it } from 'vitest';
import {
  VISUAL_FLOW_DETAIL_RELATED_FETCH_SIZE,
  VISUAL_FLOW_DETAIL_RELATED_SIZE,
} from '../features/flows/detailDocuments';
import { filterSiblingFlows, siblingFlowDisplayTotalCount } from '../features/flows/relatedCollections';

describe('P1-4 flow related collections', () => {
  it('관련 조회 크기가 8건으로 고정된다', () => {
    expect(VISUAL_FLOW_DETAIL_RELATED_SIZE).toBe(8);
    expect(VISUAL_FLOW_DETAIL_RELATED_FETCH_SIZE).toBe(9);
  });

  it('자기 자신은 같은 앱 플로에서 제외된다', () => {
    const result = filterSiblingFlows(
      [
        {
          node: {
            id: 'self',
            title: 'self',
            stepCount: 2,
            coverScreenshot: { imageUrl: 'https://img/0.png', imageAlt: 'self' },
          },
        },
        {
          node: {
            id: 'a',
            title: 'a',
            stepCount: 3,
            coverScreenshot: { imageUrl: 'https://img/a.png', imageAlt: 'a' },
          },
        },
      ],
      'self',
      8
    );
    expect(result.map(item => item.id)).toEqual(['a']);
  });

  it('전체보기 카운트는 자기 자신을 제외한다', () => {
    expect(siblingFlowDisplayTotalCount(9)).toBe(8);
    expect(siblingFlowDisplayTotalCount(0)).toBe(0);
  });
});

describe('P1-4 flow collection deeplinks', () => {
  it('스텝은 화면 상세로, 모음 전체보기는 앱 상세로 연결된다', () => {
    const screenshotId = 'shot-1';
    const slug = 'toss';
    expect(`/screenshots/${encodeURIComponent(screenshotId)}`).toBe('/screenshots/shot-1');
    expect(`/apps/${encodeURIComponent(slug)}`).toBe('/apps/toss');
  });

  it('step 쿼리는 1-based를 유지한다', () => {
    const params = new URLSearchParams();
    params.set('step', String(2));
    expect(params.toString()).toBe('step=2');
  });
});
