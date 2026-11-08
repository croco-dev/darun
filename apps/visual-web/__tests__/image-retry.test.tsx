// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ScreenshotImage } from '../features/screenshots/ScreenshotImage';

vi.mock('../features/saves/useVisualAccount', () => ({
  useVisualAccount: () => null,
}));

afterEach(cleanup);

it('retries the same image URL after repeated failures without remounting the page', () => {
  render(<ScreenshotImage src="/screen-a.png" alt="검색 화면" />);
  const first = screen.getByRole('img', { name: '검색 화면' });
  fireEvent.error(first);
  fireEvent.click(screen.getByRole('button', { name: '이미지 다시 시도' }));
  const second = screen.getByRole('img', { name: '검색 화면' });
  expect(second).not.toBe(first);
  expect(second.getAttribute('src')).toBe('/screen-a.png');
  expect(screen.getByRole('button', { name: '이미지 다시 시도' }).hasAttribute('disabled')).toBe(true);
  fireEvent.error(second);
  fireEvent.click(screen.getByRole('button', { name: '이미지 다시 시도' }));
  const third = screen.getByRole('img', { name: '검색 화면' });
  fireEvent.load(third);
  expect(third.getAttribute('src')).toBe('/screen-a.png');
  expect(screen.queryByRole('button', { name: '이미지 다시 시도' })).toBeNull();
});

it('keeps card navigation separate from the retry button', () => {
  const { container } = render(
    <ScreenshotImage src="/card.png" alt="카드 화면" href="/screenshots/card" linkLabel="카드 보기" />
  );
  fireEvent.error(screen.getByRole('img', { name: '카드 화면' }));
  const retry = screen.getByRole('button', { name: '이미지 다시 시도' });
  expect(retry.closest('a')).toBeNull();
  expect(screen.getByRole('link', { name: '카드 보기' }).textContent).toContain('이미지를 불러올 수 없어요.');
  expect(screen.getByRole('link', { name: '카드 보기' }).getAttribute('href')).toBe('/screenshots/card');
  fireEvent.click(retry);
  expect(container.querySelector('img')?.getAttribute('loading')).toBe('lazy');
});

it.each(['detail', 'step'] as const)('only enables %s zoom after a successful load, including recovery', variant => {
  const zoom = vi.fn();
  render(<ScreenshotImage src="/large.png" alt="큰 화면" variant={variant} onZoom={zoom} />);
  const image = screen.getByRole('img', { name: '큰 화면' });
  expect(image.getAttribute('fetchpriority')).toBe('high');
  expect(screen.queryByRole('button', { name: '확대' })).toBeNull();
  fireEvent.error(image);
  expect(screen.queryByRole('button', { name: '확대' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '이미지 다시 시도' }));
  expect(screen.queryByRole('button', { name: '확대' })).toBeNull();
  fireEvent.load(screen.getByRole('img', { name: '큰 화면' }));
  fireEvent.click(screen.getByRole('button', { name: '확대' }));
  expect(zoom).toHaveBeenCalledOnce();
});

it('loads a new source and ignores late events from the old source on A → B → A', () => {
  const { rerender } = render(<ScreenshotImage src="/a.png" alt="A" variant="step" />);
  const a = screen.getByRole('img', { name: 'A' });
  fireEvent.error(a);
  rerender(<ScreenshotImage src="/b.png" alt="B" variant="step" />);
  const b = screen.getByRole('img', { name: 'B' });
  fireEvent.error(a);
  fireEvent.load(b);
  expect(screen.queryByRole('button', { name: '이미지 다시 시도' })).toBeNull();
  rerender(<ScreenshotImage src="/a.png" alt="A" variant="step" />);
  fireEvent.error(screen.getByRole('img', { name: 'A' }));
  fireEvent.click(screen.getByRole('button', { name: '이미지 다시 시도' }));
  fireEvent.load(screen.getByRole('img', { name: 'A' }));
  expect(screen.queryByRole('button', { name: '이미지 다시 시도' })).toBeNull();
});

it('recovers the real screenshot detail without repeating GraphQL reads, view tracking or saves', async () => {
  const { ApolloClient, ApolloLink, InMemoryCache, Observable } = await import('@apollo/client');
  const { ApolloProvider } = await import('@apollo/client/react');
  const { ScreenshotDetail } = await import('../features/screenshots/ScreenshotDetail');
  const operations: string[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(operation => {
      operations.push(operation.operationName ?? '');
      return new Observable(observer => {
        const data =
          operation.operationName === 'VisualScreenshotOnDetail'
            ? {
                visualScreenshot: {
                  id: 'a',
                  imageUrl: '/detail-a.png',
                  imageAlt: '상세 검색 화면',
                  title: '검색',
                  platform: 'WEB',
                  screenType: 'SEARCH',
                  product: {
                    id: 'sample',
                    name: '서비스',
                    slug: 'sample',
                    summary: '',
                    logoUrl: '',
                  },
                  flows: [],
                },
              }
            : operation.operationName === 'VisualSiblingScreenshotsOnDetail'
              ? { visualScreenshots: { totalCount: 1, edges: [] } }
              : { trackVisualScreenshotView: { tracked: true } };
        observer.next({ data });
        observer.complete();
      });
    }),
  });
  try {
    render(
      <ApolloProvider client={client}>
        <ScreenshotDetail id="a" />
      </ApolloProvider>
    );
    const image = await screen.findByRole('img', { name: '상세 검색 화면' });
    expect(operations).toEqual([
      'VisualScreenshotOnDetail',
      'TrackVisualScreenshotView',
      'VisualSiblingScreenshotsOnDetail',
    ]);
    fireEvent.error(image);
    fireEvent.click(screen.getByRole('button', { name: '이미지 다시 시도' }));
    fireEvent.load(screen.getByRole('img', { name: '상세 검색 화면' }));
    expect(screen.getByRole('button', { name: '확대' })).toBeDefined();
    expect(operations).toHaveLength(3);
  } finally {
    cleanup();
    client.stop();
  }
});

it('does not steal focus from another control when a retry finishes', () => {
  render(
    <>
      <ScreenshotImage src="/focus.png" alt="초점 화면" />
      <button>다른 작업</button>
    </>
  );
  fireEvent.error(screen.getByRole('img', { name: '초점 화면' }));
  fireEvent.click(screen.getByRole('button', { name: '이미지 다시 시도' }));
  const otherControl = screen.getByRole('button', { name: '다른 작업' });
  otherControl.focus();
  fireEvent.load(screen.getByRole('img', { name: '초점 화면' }));
  expect(document.activeElement).toBe(otherControl);
});
