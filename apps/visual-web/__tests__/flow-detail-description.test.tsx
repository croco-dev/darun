// @vitest-environment jsdom

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { FlowDetail } from '../features/flows/FlowDetail';
import type { FlowDetailData } from '../features/flows/useFlowDetail';

vi.mock('@darun/utils-router', async importOriginal => ({
  ...(await importOriginal<typeof import('@darun/utils-router')>()),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('../features/collections/SaveButton', () => ({ SaveButton: () => null }));
vi.mock('../features/saves/VisualSaveButton', () => ({ VisualSaveButton: () => null }));

const detail: FlowDetailData = {
  id: 'search-flow',
  title: '상품 검색하기',
  description: '',
  platform: 'WEB',
  flowType: 'SEARCH',
  stepCount: 1,
  steps: [
    {
      position: 0,
      caption: '검색어를 입력하세요.',
      screenshot: { id: 'search', imageUrl: '/search.png', imageAlt: '검색 화면', title: null },
    },
  ],
  product: { id: 'memo', name: '메모', slug: 'memo', summary: null, logoUrl: '' },
  relatedFlows: [],
  relatedFlowTotalCount: 0,
};

function renderDescription(description: string) {
  const container = document.createElement('div');
  container.innerHTML = renderToStaticMarkup(
    <FlowDetail.ViewComponent status="loaded" detail={{ ...detail, description }} retry={() => {}} />
  );
  return container;
}

describe('플로 상세의 전체 설명', () => {
  it('제목과 플로 정보 다음에 저장된 설명을 표시하고 단계 설명을 유지한다', () => {
    const description = '검색부터 결과 확인까지의 과정을 소개합니다.';
    const container = renderDescription(description);
    const header = container.querySelector('header');
    expect(header?.querySelector('h1')?.textContent).toBe(detail.title);
    expect(header?.querySelector('ul')?.nextElementSibling?.textContent).toBe(description);
    expect(container.textContent).toContain(detail.steps[0].caption);
  });

  it.each(['', '  \n\t '])('비어 있는 설명 %j는 빈 문단을 만들지 않는다', description => {
    const container = renderDescription(description);
    expect(container.querySelectorAll('header p')).toHaveLength(1);
    expect(container.querySelector('header p')?.textContent).toBe('메모');
  });

  it('다중행과 HTML 형태의 문자열을 생략하거나 해석하지 않고 일반 텍스트로 전달한다', () => {
    const description = '첫 줄\n\nPromise<T>를 검색합니다.\n<img src=x onerror="alert(1)">';
    const container = renderDescription(description);
    const paragraph = [...container.querySelectorAll('header p')].find(node => node.textContent === description);
    expect(paragraph).toBeDefined();
    expect(paragraph?.children).toHaveLength(0);
  });
});
