import type { ReactElement, ReactNode } from 'react';
import { Children, isValidElement } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import AppPage, { generateMetadata as appMetadata } from '../app/apps/[slug]/page';
import FlowPage, { generateMetadata as flowMetadata } from '../app/flows/[id]/page';
import ScreenshotPage, { generateMetadata as screenshotMetadata } from '../app/screenshots/[id]/page';

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('../app/serverContainer', () => ({ container: { serverApolloClient: { query } } }));
vi.mock('../app/VisualLayout', () => ({ VisualLayout: ({ children }: { children: ReactNode }) => children }));
vi.mock('../features/screenshots', () => ({ ScreenshotDetail: () => null }));
vi.mock('../features/flows', () => ({ FlowDetail: () => null }));
vi.mock('../features/apps', () => ({ AppDetail: () => null }));
vi.mock('@darun/utils-router', () => ({
  notFound: () => {
    throw new Error('NOT_FOUND');
  },
}));

beforeEach(() => {
  query.mockReset();
});
function initialDetail(node: ReactNode): unknown {
  for (const child of Children.toArray(node)) {
    if (!isValidElement(child)) continue;
    const element = child as ReactElement<{ initialDetail?: unknown; children?: ReactNode }>;
    if (element.props.initialDetail) return element.props.initialDetail;
    const nested = initialDetail(element.props.children);
    if (nested) return nested;
  }
}
const shot = {
  id: 'shot',
  title: null,
  imageUrl: '/search.svg',
  imageAlt: '검색 화면',
  product: { name: '메모', slug: 'memo' },
};
const flow = { id: 'flow', title: '검색 플로', product: { name: '메모', slug: 'memo' } };
const app = { id: 'memo', name: '메모', slug: 'memo', summary: '요약' };

it('서버의 화면 상세를 클라이언트에 전달하고 canonical·OG·대체 제목을 유지한다', async () => {
  query.mockResolvedValue({ data: { visualScreenshot: shot } });
  const params = Promise.resolve({ id: 'shot' });
  expect(initialDetail(await ScreenshotPage({ params }))).toEqual(shot);
  const metadata = await screenshotMetadata({ params });
  expect(metadata.title).toBe('검색 화면 — 메모 — 다른 Visual');
  expect(metadata.alternates?.canonical).toBe('/screenshots/shot');
  expect(metadata.openGraph).toMatchObject({ images: [{ url: '/search.svg', alt: '검색 화면' }] });
});
it('서버의 전체 플로 상세와 앱 상세를 전달하고 metadata를 유지한다', async () => {
  query.mockResolvedValueOnce({ data: { visualFlow: flow } }).mockResolvedValueOnce({ data: { productBySlug: app } });
  expect(initialDetail(await FlowPage({ params: Promise.resolve({ id: 'flow' }) }))).toEqual(flow);
  expect(initialDetail(await AppPage({ params: Promise.resolve({ slug: 'memo' }) }))).toEqual(app);
  query.mockResolvedValueOnce({ data: { visualFlow: flow } }).mockResolvedValueOnce({ data: { productBySlug: app } });
  expect(await flowMetadata({ params: Promise.resolve({ id: 'flow' }) })).toMatchObject({
    title: '검색 플로 — 메모 — 다른 Visual',
    alternates: { canonical: '/flows/flow' },
  });
  expect(await appMetadata({ params: Promise.resolve({ slug: 'memo' }) })).toMatchObject({
    title: '메모 — 다른 Visual',
    alternates: { canonical: '/apps/memo' },
  });
});
it('존재하지 않는 세 상세는 404이고 조회 장애를 404로 숨기지 않는다', async () => {
  query.mockResolvedValue({ data: { visualScreenshot: null, visualFlow: null, productBySlug: null } });
  const params = Promise.resolve({ id: 'missing', slug: 'missing' });
  for (const page of [ScreenshotPage, FlowPage, AppPage]) await expect(page({ params })).rejects.toThrow('NOT_FOUND');
  for (const metadata of [screenshotMetadata, flowMetadata, appMetadata])
    expect(await metadata({ params })).toEqual({});
  query.mockRejectedValue(new Error('합성 서버 조회 실패'));
  for (const page of [ScreenshotPage, FlowPage, AppPage])
    await expect(page({ params })).rejects.toThrow('합성 서버 조회 실패');
});
