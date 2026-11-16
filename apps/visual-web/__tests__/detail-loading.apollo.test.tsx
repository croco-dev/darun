// @vitest-environment jsdom
import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { useAppDetail } from '../features/apps/useAppDetail';
import { useFlowDetail } from '../features/flows/useFlowDetail';
import { ScreenshotDetail } from '../features/screenshots/ScreenshotDetail';
import { useScreenshotDetail } from '../features/screenshots/useScreenshotDetail';

vi.mock('../features/saves/useVisualAccount', () => ({ useVisualAccount: () => null }));

const product = {
  id: 'memo',
  name: '메모',
  slug: 'memo',
  summary: '요약',
  description: '앱 설명',
  logoUrl: '',
};
const screenshot = {
  id: 'shot',
  title: '검색 화면',
  imageUrl: '/search.svg',
  imageAlt: '검색',
  platform: 'WEB' as const,
  screenType: 'SEARCH' as const,
  product,
};
const flow = {
  id: 'flow',
  title: '검색 플로',
  description: '플로 설명',
  platform: 'WEB' as const,
  flowType: 'SEARCH' as const,
  stepCount: 1,
  coverScreenshot: screenshot,
  steps: [{ position: 0, caption: '검색어 입력', screenshot }],
  product,
};
const clients: ApolloClient[] = [];
afterEach(() => {
  cleanup();
  clients.splice(0).forEach(client => client.stop());
  vi.restoreAllMocks();
});

function fixture(primaryState: 'success' | 'missing' | 'error' = 'success') {
  const calls: string[] = [];
  const pending: Array<{
    variables: Record<string, unknown>;
    succeed: (data?: Record<string, unknown>) => void;
    fail: () => void;
  }> = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      operation =>
        new Observable(observer => {
          calls.push(operation.operationName ?? '');
          const send = (data: Record<string, unknown>) => {
            observer.next({ data });
            observer.complete();
          };
          if (
            ['VisualScreenshotOnDetail', 'VisualFlowOnDetail', 'AppDetailOnVisualApps'].includes(
              operation.operationName ?? ''
            )
          ) {
            if (primaryState === 'error') {
              observer.error(new Error('합성 상세 실패'));
              return;
            }
            if (primaryState === 'missing') {
              send({ visualScreenshot: null, visualFlow: null, productBySlug: null });
              return;
            }
          }
          switch (operation.operationName) {
            case 'VisualScreenshotOnDetail':
              send({ visualScreenshot: screenshot });
              break;
            case 'VisualFlowOnDetail':
              send({ visualFlow: flow });
              break;
            case 'AppDetailOnVisualApps':
              send({ productBySlug: product });
              break;
            case 'TrackVisualScreenshotView':
              send({ trackVisualScreenshotView: { tracked: true } });
              break;
            case 'TrackVisualFlowView':
              send({ trackVisualFlowView: { tracked: true } });
              break;
            default:
              pending.push({
                variables: operation.variables,
                succeed: data =>
                  send(
                    data ?? {
                      visualScreenshot: {
                        id: operation.variables['id'],
                        flows: { edges: [], pageInfo: { hasNextPage: false, endCursor: null } },
                      },
                      visualScreenshots: { totalCount: 0, edges: [] },
                      visualFlows: { totalCount: 0, edges: [] },
                    }
                  ),
                fail: () => observer.error(new Error('합성 연관 목록 실패')),
              });
          }
        })
    ),
  });
  clients.push(client);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  function Wrapper({ children }: { children: ReactNode }) {
    return <ApolloProvider client={client}>{children}</ApolloProvider>;
  }
  return { calls, pending, wrapper: Wrapper };
}

it.each(['screenshot', 'flow', 'app'] as const)(
  '%s 핵심 정보를 연관 응답보다 먼저 표시하고 연관 실패만 재시도한다',
  async kind => {
    const f = fixture();
    const { result } = renderHook(
      () => {
        const shot = useScreenshotDetail('shot');
        const currentFlow = useFlowDetail('flow');
        const app = useAppDetail('memo');
        return kind === 'screenshot' ? shot : kind === 'flow' ? currentFlow : app;
      },
      { wrapper: f.wrapper }
    );
    await waitFor(() => expect(f.pending).toHaveLength(3));
    expect(result.current.status).toBe('loaded');
    expect(result.current.detail).not.toBeNull();
    expect(result.current.relatedStatus).toBe('loading');
    await act(async () => f.pending.forEach(request => request.fail()));
    expect(result.current.status).toBe('loaded');
    expect(result.current.relatedStatus).toBe('error');
    const primaryCalls = f.calls.filter(name =>
      ['VisualScreenshotOnDetail', 'VisualFlowOnDetail', 'AppDetailOnVisualApps'].includes(name)
    );
    await act(async () => result.current.retryRelated());
    expect(f.pending).toHaveLength(4);
    expect(result.current.status).toBe('loaded');
    expect(f.calls.filter(name => primaryCalls.includes(name))).toEqual(primaryCalls);
    await act(async () => f.pending[3].succeed());
    expect(result.current.relatedStatus).toBe('loaded');
  }
);

it('서버 상세로 최초 렌더하며 hydration 후 핵심 query를 보내지 않는다', async () => {
  const f = fixture();
  const { result } = renderHook(
    () => ({
      shot: useScreenshotDetail('shot', screenshot),
      flow: useFlowDetail('flow', flow),
      app: useAppDetail('memo', product),
    }),
    { wrapper: f.wrapper }
  );
  expect(result.current.shot.detail?.title).toBe('검색 화면');
  expect(result.current.flow.detail?.steps[0].caption).toBe('검색어 입력');
  expect(result.current.app.detail?.name).toBe('메모');
  await waitFor(() => expect(f.pending).toHaveLength(3));
  expect(f.calls).not.toContain('VisualScreenshotOnDetail');
  expect(f.calls).not.toContain('VisualFlowOnDetail');
  expect(f.calls).not.toContain('AppDetailOnVisualApps');
});

it.each(['missing', 'error'] as const)('핵심 상세 %s 상태는 빈 연관 목록으로 숨기지 않는다', async state => {
  const f = fixture(state);
  const { result } = renderHook(
    () => ({ shot: useScreenshotDetail('shot'), flow: useFlowDetail('flow'), app: useAppDetail('memo') }),
    { wrapper: f.wrapper }
  );
  await waitFor(() => expect(result.current.shot.status).toBe(state === 'missing' ? 'not-found' : 'error'));
  for (const detail of Object.values(result.current)) {
    expect(detail.status).toBe(state === 'missing' ? 'not-found' : 'error');
    expect(detail.detail).toBeNull();
  }
  expect(f.pending).toHaveLength(0);
});

it('다른 상세로 이동하면 이전 연관 응답과 오류는 현재 상세를 바꾸지 않는다', async () => {
  const f = fixture();
  const { result, rerender } = renderHook(({ id }) => useScreenshotDetail(id, { ...screenshot, id, title: id }), {
    wrapper: f.wrapper,
    initialProps: { id: 'old' },
  });
  await waitFor(() => expect(f.pending).toHaveLength(1));
  rerender({ id: 'new' });
  await waitFor(() => expect(f.pending).toHaveLength(2));
  await act(async () => f.pending[0].fail());
  expect(result.current.detail?.title).toBe('new');
  expect(result.current.relatedStatus).toBe('loading');
  await act(async () => f.pending[1].succeed());
  expect(result.current.relatedStatus).toBe('loaded');
  expect(result.current.detail?.title).toBe('new');
});

it('추가 플로 조회가 실패해도 카드를 유지하고 재시도 성공 후 새 카드에서 키보드 탐색을 이어간다', async () => {
  const f = fixture();
  render(<ScreenshotDetail id="shot" initialDetail={screenshot} />, { wrapper: f.wrapper });
  const edge = (id: number) => ({
    node: { ...flow, id: `flow-${id}`, title: `플로 ${id}` },
  });
  const firstEdges = Array.from({ length: 8 }, (_, index) => edge(index + 1));
  await waitFor(() => expect(f.pending).toHaveLength(1));
  await act(async () =>
    f.pending[0].succeed({
      visualScreenshot: {
        id: 'shot',
        flows: { edges: firstEdges, pageInfo: { hasNextPage: true, endCursor: 'opaque-first-page-cursor' } },
      },
      visualScreenshots: {
        edges: [{ node: { ...screenshot, id: 'sibling', title: '채팅 화면' } }],
        totalCount: 2,
      },
    })
  );
  const region = within(screen.getByRole('region', { name: '관련 플로' }));
  const cards = () => {
    const links = region.queryAllByRole('link');
    return region.getAllByRole('listitem').map(item => {
      const cardLinks = links.filter(link => item.contains(link));
      expect(cardLinks).toHaveLength(1);
      return cardLinks[0];
    });
  };
  const siblingLink = () =>
    within(screen.getByRole('region', { name: /^다른 화면/ })).getByRole('link', { name: /채팅 화면/ });
  const more = region.getByRole('button', { name: '관련 플로 더 보기' });
  expect(cards()).toHaveLength(8);
  more.focus();
  fireEvent.click(more);
  fireEvent.click(more);
  expect(f.pending).toHaveLength(2);
  expect(f.pending[1].variables).toMatchObject({ flowAfter: 'opaque-first-page-cursor', includeSiblings: false });
  expect(region.getByRole('button', { name: '불러오는 중…' }).getAttribute('aria-disabled')).toBe('true');
  expect(cards()).toHaveLength(8);
  await act(async () => f.pending[1].fail());
  expect(region.getByRole('alert')).toBeDefined();
  expect(cards()).toHaveLength(8);
  expect(siblingLink().getAttribute('href')).toBe('/screenshots/sibling');

  const retry = region.getByRole('button', { name: '관련 플로 다시 시도' });
  expect(document.activeElement).toBe(retry);
  fireEvent.click(retry);
  expect(f.pending[2].variables).toEqual(f.pending[1].variables);
  await act(async () =>
    f.pending[2].succeed({
      visualScreenshot: {
        id: 'shot',
        flows: { edges: [edge(9)], pageInfo: { hasNextPage: false, endCursor: 'last' } },
      },
    })
  );
  const loadedCards = cards();
  expect(loadedCards.map(card => card.getAttribute('href'))).toEqual(
    Array.from({ length: 9 }, (_, index) => `/flows/flow-${index + 1}`)
  );
  expect(document.activeElement).toBe(loadedCards[8]);
  expect(siblingLink()).toBeDefined();
  expect(region.queryByRole('button')).toBeNull();
  expect(region.queryByRole('alert')).toBeNull();
  expect(f.calls).not.toContain('VisualScreenshotOnDetail');
});
