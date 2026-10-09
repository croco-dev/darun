import { describe, expect, it } from 'vitest';
import {
  VISUAL_SCREENSHOT_DETAIL_RELATED_FETCH_SIZE,
  VISUAL_SCREENSHOT_DETAIL_RELATED_SIZE,
} from '../features/screenshots/detailDocuments';
import {
  filterSiblingScreenshots,
  normalizeDetailFlows,
  siblingDisplayTotalCount,
} from '../features/screenshots/relatedCollections';

describe('P1-3 screenshot related collections', () => {
  it('관련 조회 크기가 8건으로 고정된다', () => {
    expect(VISUAL_SCREENSHOT_DETAIL_RELATED_SIZE).toBe(8);
    expect(VISUAL_SCREENSHOT_DETAIL_RELATED_FETCH_SIZE).toBe(9);
  });

  it('자기 자신은 같은 앱 화면에서 제외된다', () => {
    const result = filterSiblingScreenshots(
      [
        { node: { id: 'self', imageUrl: 'https://img/0.png', imageAlt: 'self', title: 'self' } },
        { node: { id: 'a', imageUrl: 'https://img/a.png', imageAlt: 'a', title: 'a' } },
        { node: { id: 'b', imageUrl: 'https://img/b.png', imageAlt: 'b', title: 'b' } },
      ],
      'self',
      8
    );
    expect(result.map(item => item.id)).toEqual(['a', 'b']);
  });

  it('전체보기 카운트는 자기 자신을 제외한다', () => {
    expect(siblingDisplayTotalCount(9)).toBe(8);
    expect(siblingDisplayTotalCount(0)).toBe(0);
  });

  it('커버 없는 플로는 모음에서 제외된다', () => {
    const result = normalizeDetailFlows([
      {
        id: 'f1',
        title: '회원가입',
        stepCount: 3,
        coverScreenshot: { imageUrl: 'https://img/c.png', imageAlt: 'cover' },
      },
      { id: 'f2', title: '결제', stepCount: 2, coverScreenshot: null },
    ]);
    expect(result.map(flow => flow.id)).toEqual(['f1']);
  });
});

describe('P1-3 screenshot collection deeplinks', () => {
  it('화면 상세 모음 전체보기가 앱 상세로 연결된다', () => {
    const slug = 'toss';
    expect(`/apps/${encodeURIComponent(slug)}`).toBe('/apps/toss');
  });
});
