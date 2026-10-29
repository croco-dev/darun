// @vitest-environment jsdom

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AppDetail } from '../features/apps/AppDetail';

vi.mock('../features/collections/SaveButton', () => ({ SaveButton: () => null }));
vi.mock('../features/apps/useAppDetail', () => ({
  useAppDetail: () => ({
    status: 'loaded',
    detail: {
      id: 'sdk-app',
      slug: 'sdk-app',
      name: 'SDK 앱',
      summary: '요약 대신 전체 설명을 표시합니다.',
      description: 'SDK는 Promise<T>와 Array<string>를 지원합니다.\n<사용자명>: 5 < 3 그리고 a > b',
      logoUrl: '',
      screenshots: [],
      screenshotTotalCount: 0,
      flows: [],
      flowTotalCount: 0,
    },
  }),
}));

describe('앱 상세의 설명', () => {
  it('앱 정보에 일반 설명의 기술 표기와 줄바꿈을 온전히 전달한다', () => {
    const container = document.createElement('div');
    container.innerHTML = renderToStaticMarkup(<AppDetail slug="sdk-app" />);
    const info = container.querySelector('details');
    expect(info?.querySelector('summary')?.textContent).toBe('앱 정보');
    expect(info?.querySelector('p')?.textContent).toBe(
      'SDK는 Promise<T>와 Array<string>를 지원합니다.\n<사용자명>: 5 < 3 그리고 a > b'
    );
    expect(info?.querySelector('p')?.children).toHaveLength(0);
  });
});
