// @vitest-environment jsdom
import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { notifications } from '@mantine/notifications';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React, { useEffect, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LlmJobListSection } from '../features/llm-jobs/LlmJobListSection';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('@darun/utils-router', () => ({
  useRouter: () => ({ push }),
  usePathname: () => window.location.pathname,
  Link: ({ children, ...props }: React.ComponentProps<'a'>) => <a {...props}>{children}</a>,
}));
vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));
vi.mock('@darun/ui', async importOriginal => {
  // Paging uses the real list, Apollo, and buttons; decorative SVGs need not multiply the 100-row fixture DOM.
  const actual = await importOriginal<Record<string, unknown>>();
  const DecorativeIcon = () => null;
  return {
    ...actual,
    AlertCircle: DecorativeIcon,
    CheckCircle2: DecorativeIcon,
    Clock: DecorativeIcon,
    Copy: DecorativeIcon,
    Globe: DecorativeIcon,
    Info: DecorativeIcon,
    RefreshCw: DecorativeIcon,
    RotateCw: DecorativeIcon,
    Sparkles: DecorativeIcon,
  };
});
vi.mock('@darun/ui-admin', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  AdminModal: ({ opened, children }: { opened: boolean; children: React.ReactNode }) =>
    opened ? <div role="dialog">{children}</div> : null,
}));

interface Request {
  name: string;
  variables: Record<string, unknown>;
  resolve: (data: Record<string, unknown>) => void;
  network: () => void;
  graphql: () => void;
}

function description(id = 'failed-A', productSlug = 'current-address') {
  return {
    __typename: 'ProductDescriptionJob',
    id,
    productId: 'product-1',
    productSlug,
    status: 'failed',
    writerModel: 'writer',
    reviewerModel: 'reviewer',
    message: null,
    error: '합성 소개 실패',
    createdAt: '2026-10-17T01:00:00Z',
    updatedAt: '2026-10-17T01:01:00Z',
  };
}
function retryResult(id = 'new-logical-job', productSlug = 'renamed-address') {
  return {
    retryProductDescriptionJob: {
      ...description(id, productSlug),
      status: 'pending',
      error: null,
    },
  };
}
function translationRow(index: number, status = 'completed') {
  return {
    __typename: 'TranslationJob' as const,
    id: `translation-${index}`,
    entityType: 'Product',
    entityId: `entity-${index}`,
    locale: 'en',
    status,
    model: 'translator',
    message: null,
    error: null,
    createdAt: '2026-10-17T01:00:00Z',
    updatedAt: '2026-10-17T01:01:00Z',
  };
}
function Route() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const update = () => setPath(window.location.pathname);
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, []);
  return path === '/llm-jobs' ? <LlmJobListSection /> : <h1>다른 관리자 페이지</h1>;
}
const clients: ApolloClient[] = [];
function setup(translation = false) {
  const pending: Request[] = [];
  const log: Request[] = [];
  const replies: { name: string; data: Record<string, unknown>; received: (request: Request) => void }[] = [];
  const link = new ApolloLink(
    operation =>
      new Observable(observer => {
        const request: Request = {
          name: operation.operationName ?? '',
          variables: operation.variables,
          resolve(data) {
            observer.next({ data });
            observer.complete();
          },
          network() {
            observer.error(new Error('합성 네트워크 실패'));
          },
          graphql() {
            observer.next({ errors: [{ message: '합성 GraphQL 실패' }] });
            observer.complete();
          },
        };
        log.push(request);
        const replyIndex = replies.findIndex(reply => reply.name === request.name);
        if (replyIndex < 0) pending.push(request);
        else {
          const reply = replies.splice(replyIndex, 1)[0]!;
          request.resolve(reply.data);
          reply.received(request);
        }
      })
  );
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link,
    // The extension suggestion timer can outlive this jsdom environment.
    devtools: { enabled: false },
  });
  clients.push(client);
  const view = render(
    <ApolloProvider client={client}>
      <Route />
    </ApolloProvider>
  );
  return {
    ...view,
    client,
    log,
    // Paging success cases do not assert an intermediate network-loading render.
    // Pending, failure, and stale-response cases keep manual delivery through take().
    replyNext(name: string, data: Record<string, unknown>) {
      return new Promise<Request>(received => replies.push({ name, data, received }));
    },
    async take(name: string) {
      await waitFor(() => expect(pending.some(request => request.name === name)).toBe(true));
      return pending.splice(
        pending.findIndex(request => request.name === name),
        1
      )[0]!;
    },
    async lists(rows?: ReturnType<typeof translationRow>[]) {
      const descriptions = await this.take('GetProductDescriptionJobsOnAdmin');
      const translations = await this.take('GetTranslationJobsOnAdmin');
      expect(descriptions.variables).toEqual({ limit: 100, offset: 0 });
      expect(translations.variables).toEqual({ limit: 100, offset: 0 });
      await flush(() => {
        descriptions.resolve({
          productDescriptionJobs: [description(), description('failed-B', 'other-address')],
        });
        translations.resolve({
          translationJobs:
            rows ??
            (translation
              ? [
                  {
                    __typename: 'TranslationJob',
                    id: 'translation-A',
                    entityType: 'Product',
                    entityId: 'product-2',
                    locale: 'en',
                    status: 'failed',
                    model: 'translator',
                    message: null,
                    error: '번역 실패',
                    createdAt: '2026-10-16T01:00:00Z',
                    updatedAt: '2026-10-16T01:01:00Z',
                  },
                ]
              : []),
        });
      });
      await waitFor(() => expect(screen.getByRole('link', { name: 'failed-A 소개 후보 열기' })).toBeTruthy());
    },
  };
}
async function flush(action: () => void) {
  await act(async () => {
    action();
    await Promise.resolve();
  });
}
async function navigate(path: string) {
  await flush(() => {
    window.history.pushState(null, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
}
function retryButton(id = 'failed-A') {
  const row = screen.getByRole('link', { name: `${id} 소개 후보 열기` }).closest('tr')!;
  return within(row).getByRole<HTMLButtonElement>('button', { name: '재시도' });
}

beforeEach(() => {
  sessionStorage.clear();
  vi.clearAllMocks();
  window.history.replaceState(null, '', '/llm-jobs');
  push.mockImplementation((path: string) => {
    window.history.pushState(null, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  for (const client of clients.splice(0)) client.stop();
});

describe('list retry authority through real Apollo hooks and default cache', () => {
  async function firstTranslationPage(count = 100) {
    const fixture = setup();
    const translations = await fixture.take('GetTranslationJobsOnAdmin');
    const descriptions = await fixture.take('GetProductDescriptionJobsOnAdmin');
    await flush(() => {
      translations.resolve({
        translationJobs: Array.from({ length: count }, (_, i) => translationRow(i)),
      });
      descriptions.resolve({ productDescriptionJobs: [] });
    });
    await waitFor(() =>
      expect(
        within(document.querySelector<HTMLElement>(`div[title="Product: entity-${count - 1}"]`)!).getByText(
          `entity-${count - 1}`
        )
      ).toBeTruthy()
    );
    await flush(() =>
      fireEvent.click(screen.getByText('영문 번역', { selector: 'button, button > span' }).closest('button')!)
    );
    return fixture;
  }

  it.each(['GetTranslationJobsOnAdmin', 'GetProductDescriptionJobsOnAdmin'])(
    'shows %s failure beside the other successful list and recovers by query only',
    async failingName => {
      const fixture = setup();
      const translation = await fixture.take('GetTranslationJobsOnAdmin');
      const descriptionRequest = await fixture.take('GetProductDescriptionJobsOnAdmin');
      await flush(() => {
        if (failingName === translation.name) {
          translation.graphql();
          descriptionRequest.resolve({
            productDescriptionJobs: [description()],
          });
        } else {
          descriptionRequest.graphql();
          translation.resolve({ translationJobs: [translationRow(7)] });
        }
      });
      await waitFor(() => expect(screen.getByText('일부 작업 목록을 조회하지 못했습니다.')).toBeTruthy());
      expect(screen.queryByText('등록된 LLM 작업이 없습니다.')).toBeNull();
      expect(screen.getAllByRole('row')).toHaveLength(2);
      await flush(() => fireEvent.click(screen.getByRole('button', { name: '다시 시도' })));
      const translationRefresh = await fixture.take('GetTranslationJobsOnAdmin');
      const descriptionRefresh = await fixture.take('GetProductDescriptionJobsOnAdmin');
      await flush(() => {
        translationRefresh.resolve({ translationJobs: [translationRow(7)] });
        descriptionRefresh.resolve({ productDescriptionJobs: [description()] });
      });
      await waitFor(() => expect(screen.queryByText('일부 작업 목록을 조회하지 못했습니다.')).toBeNull());
      expect(screen.getAllByRole('row')).toHaveLength(3);
      expect(fixture.log.every(request => request.name.startsWith('Get'))).toBe(true);
    }
  );

  it('loads translations beyond 100 with a bounded next-page request', async () => {
    const fixture = await firstTranslationPage();
    const next = fixture.replyNext('GetTranslationJobsOnAdmin', { translationJobs: [translationRow(100)] });
    await flush(() =>
      fireEvent.click(screen.getByText('더 보기 (+100건)', { selector: 'button, button > span' }).closest('button')!)
    );
    expect((await next).variables).toEqual({ limit: 100, offset: 100 });
    await waitFor(() =>
      expect(
        within(document.querySelector<HTMLElement>('div[title="Product: entity-100"]')!).getByText('entity-100')
      ).toBeTruthy()
    );
    expect(
      within(document.querySelector<HTMLElement>('div[title="Product: entity-0"]')!).getByText('entity-0')
    ).toBeTruthy();
    expect(screen.getByText('현재 101건 표시 중', { selector: 'span.tabular-nums' })).toBeTruthy();
    expect(screen.queryByText('더 보기 (+100건)')).toBeNull();
    expect(screen.getByText('마지막 작업입니다.')).toBeTruthy();
    expect(fixture.log.filter(r => r.name === 'GetTranslationJobsOnAdmin').every(r => r.variables.limit === 100)).toBe(
      true
    );
  });

  it('소개 다음 페이지 실패는 기존 행과 위치를 유지하고 필터 변경 뒤 늦은 응답은 합치지 않는다', async () => {
    const fixture = setup();
    const first = await fixture.take('GetProductDescriptionJobsOnAdmin');
    const translations = await fixture.take('GetTranslationJobsOnAdmin');
    const rows = Array.from({ length: 100 }, (_, i) => ({
      ...description(`job-${i}`),
      status: 'completed',
      error: null,
    }));
    await flush(() => {
      first.resolve({ productDescriptionJobs: rows });
      translations.resolve({ translationJobs: [] });
    });
    await flush(() =>
      fireEvent.click(screen.getByText('더 보기 (+100건)', { selector: 'button > span' }).closest('button')!)
    );
    const failed = await fixture.take('GetProductDescriptionJobsOnAdmin');
    expect(failed.variables).toEqual({ limit: 100, offset: 100 });
    await flush(() => failed.network());
    expect(document.querySelectorAll('tbody tr')).toHaveLength(100);
    await flush(() =>
      fireEvent.click(screen.getByText('더 보기 (+100건)', { selector: 'button > span' }).closest('button')!)
    );
    const old = await fixture.take('GetProductDescriptionJobsOnAdmin');
    expect(old.variables).toEqual(failed.variables);
    await flush(() => fireEvent.click(screen.getByText('실패', { selector: 'button' })));
    const filtered = await fixture.take('GetProductDescriptionJobsOnAdmin');
    const filteredTranslation = await fixture.take('GetTranslationJobsOnAdmin');
    expect(filtered.variables).toEqual({
      status: 'failed',
      limit: 100,
      offset: 0,
    });
    await flush(() => {
      filtered.resolve({ productDescriptionJobs: [description('filtered')] });
      filteredTranslation.resolve({ translationJobs: [] });
    });
    await flush(() => old.resolve({ productDescriptionJobs: [description('stale')] }));
    expect(document.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(document.querySelector('a[aria-label="stale 소개 후보 열기"]')).toBeNull();
    expect(document.querySelector('a[aria-label="filtered 소개 후보 열기"]')).toBeTruthy();
  });

  it('자동 갱신은 소개의 과거 페이지와 선택한 오류 작업을 유지한다', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const fixture = setup();
    const rows = Array.from({ length: 101 }, (_, i) => ({
      ...description(`job-${i}`),
      status: i === 0 ? 'pending' : i === 100 ? 'failed' : 'completed',
      error: i === 100 ? '합성 소개 실패' : null,
    }));
    const first = await fixture.take('GetProductDescriptionJobsOnAdmin');
    const translations = await fixture.take('GetTranslationJobsOnAdmin');
    await flush(() => {
      first.resolve({ productDescriptionJobs: rows.slice(0, 100) });
      translations.resolve({ translationJobs: [] });
    });
    const next = fixture.replyNext('GetProductDescriptionJobsOnAdmin', { productDescriptionJobs: rows.slice(100) });
    await flush(() =>
      fireEvent.click(screen.getByText('더 보기 (+100건)', { selector: 'button > span' }).closest('button')!)
    );
    expect((await next).variables).toEqual({ limit: 100, offset: 100 });
    const lastRow = document.querySelector<HTMLElement>('div[title="job-100"]')!.closest('tr')!;
    await flush(() =>
      fireEvent.click(lastRow.querySelector<HTMLButtonElement>('button[aria-label="에러 상세 보기"]')!)
    );
    const firstRow = within(document.querySelector<HTMLElement>('div[title="job-0"]')!.closest('tr')!);
    expect(firstRow.getByText('대기 중')).toBeTruthy();
    const refreshed = rows.map((row, index) =>
      index === 0
        ? { ...row, status: 'completed', message: '새 소개 완료' }
        : index === 100
          ? { ...row, error: '갱신된 소개 실패' }
          : row
    );
    const refresh = fixture.replyNext('GetProductDescriptionJobsOnAdmin', {
      productDescriptionJobs: refreshed.slice(0, 100),
    });
    const tail = fixture.replyNext('GetProductDescriptionJobsOnAdmin', {
      productDescriptionJobs: refreshed.slice(100),
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect((await refresh).variables).toEqual({ limit: 100, offset: 0 });
    expect((await tail).variables).toEqual({ limit: 100, offset: 100 });
    await waitFor(() => expect(firstRow.getByText('새 소개 완료')).toBeTruthy());
    expect(firstRow.getByText('완료')).toBeTruthy();
    expect(within(lastRow).getByText('갱신된 소개 실패')).toBeTruthy();
    expect(document.querySelectorAll('tbody tr')).toHaveLength(101);
    expect(within(document.querySelector<HTMLElement>('[role="dialog"]')!).getByText('job-100')).toBeTruthy();
    expect(document.querySelector('a[aria-label="job-100 소개 후보 열기"]')).toBeTruthy();
    vi.useRealTimers();
  });

  it('keeps the loaded rows after a failed next page and retries the same offset', async () => {
    const fixture = await firstTranslationPage();
    await flush(() =>
      fireEvent.click(screen.getByText('더 보기 (+100건)', { selector: 'button, button > span' }).closest('button')!)
    );
    const failed = await fixture.take('GetTranslationJobsOnAdmin');
    expect(failed.variables).toEqual({ limit: 100, offset: 100 });
    await flush(() => failed.network());
    await waitFor(() =>
      expect(notifications.show).toHaveBeenCalledWith(expect.objectContaining({ title: '목록 조회 실패' }))
    );
    expect(within(screen.getByTitle('Product: entity-1')).getByText('entity-1')).toBeTruthy();
    await flush(() =>
      fireEvent.click(screen.getByText('더 보기 (+100건)', { selector: 'button, button > span' }).closest('button')!)
    );
    const retry = await fixture.take('GetTranslationJobsOnAdmin');
    expect(retry.variables).toEqual({ limit: 100, offset: 100 });
    await flush(() => retry.resolve({ translationJobs: [translationRow(100)] }));
    await waitFor(() => expect(within(screen.getByTitle('Product: entity-100')).getByText('entity-100')).toBeTruthy());
    expect(within(screen.getByTitle('Product: entity-0')).getByText('entity-0')).toBeTruthy();
    expect(screen.getByText('현재 101건 표시 중', { selector: 'span.tabular-nums' })).toBeTruthy();
  });

  it('ignores the old next page after the status filter changes', async () => {
    const fixture = await firstTranslationPage();
    await flush(() =>
      fireEvent.click(screen.getByText('더 보기 (+100건)', { selector: 'button, button > span' }).closest('button')!)
    );
    const old = await fixture.take('GetTranslationJobsOnAdmin');
    await flush(() =>
      fireEvent.click(screen.getByText('실패', { selector: 'button, button > span' }).closest('button')!)
    );
    const filtered = await fixture.take('GetTranslationJobsOnAdmin');
    expect(filtered.variables).toEqual({
      status: 'failed',
      limit: 100,
      offset: 0,
    });
    await flush(() => filtered.resolve({ translationJobs: [translationRow(200, 'failed')] }));
    await waitFor(() => expect(within(screen.getByTitle('Product: entity-200')).getByText('entity-200')).toBeTruthy());
    await flush(() => old.resolve({ translationJobs: [translationRow(100)] }));
    expect(screen.queryByTitle('Product: entity-100')).toBeNull();
    expect(within(screen.getByTitle('Product: entity-200')).getByText('entity-200')).toBeTruthy();
  });

  it.each(['success', 'network', 'graphql'] as const)(
    'ignores late %s after route departure and same-ID remount',
    async ending => {
      const fixture = setup();
      await fixture.lists();
      expect(screen.getByRole('link', { name: 'failed-A 소개 후보 열기' }).getAttribute('href')).toBe(
        '/products/current-address?descriptionJobId=failed-A'
      );
      await flush(() => fireEvent.click(retryButton()));
      const old = await fixture.take('RetryProductDescriptionJobOnAdmin');
      expect(old.variables).toEqual({
        id: 'failed-A',
        requestId: expect.any(String),
      });
      expect(retryButton().disabled).toBe(true);
      expect(retryButton('failed-B').disabled).toBe(false);
      await navigate('/settings/llm');
      expect(screen.getByRole('heading', { name: '다른 관리자 페이지' })).toBeTruthy();
      await navigate('/llm-jobs');
      await fixture.lists();
      await flush(() => fireEvent.click(retryButton()));
      const current = await fixture.take('RetryProductDescriptionJobOnAdmin');
      expect(current.variables).toEqual(old.variables);
      const before = fixture.log.length;
      await flush(() => {
        if (ending === 'success') old.resolve(retryResult('old-logical-job', 'old-response-address'));
        else old[ending]();
      });
      expect(window.location.pathname).toBe('/llm-jobs');
      expect(push).not.toHaveBeenCalled();
      expect(notifications.show).not.toHaveBeenCalled();
      expect(fixture.log).toHaveLength(before);
      expect(retryButton().disabled).toBe(true);
      await flush(() => current.resolve(retryResult()));
      await waitFor(() =>
        expect(push).toHaveBeenCalledWith('/products/renamed-address?descriptionJobId=new-logical-job')
      );
      expect(window.location.pathname + window.location.search).toBe(
        '/products/renamed-address?descriptionJobId=new-logical-job'
      );
      expect(notifications.show).toHaveBeenCalledWith(expect.objectContaining({ title: '재시도 요청 성공' }));
    }
  );

  it.each(['success', 'network', 'graphql'] as const)('ignores late %s after a full unmount', async ending => {
    const fixture = setup();
    await fixture.lists();
    await flush(() => fireEvent.click(retryButton()));
    const old = await fixture.take('RetryProductDescriptionJobOnAdmin');
    fixture.unmount();
    window.history.pushState(null, '', '/products');
    const before = fixture.log.length;
    await flush(() => {
      if (ending === 'success') old.resolve(retryResult());
      else old[ending]();
    });
    expect(window.location.pathname).toBe('/products');
    expect(push).not.toHaveBeenCalled();
    expect(notifications.show).not.toHaveBeenCalled();
    expect(fixture.log).toHaveLength(before);
  });

  it('목록과 오류 모달의 같은 작업 재시도를 중복 전송하지 않는다', async () => {
    const fixture = setup();
    await fixture.lists();
    await flush(() => fireEvent.click(retryButton()));
    const request = await fixture.take('RetryProductDescriptionJobOnAdmin');
    const row = screen.getByRole('link', { name: 'failed-A 소개 후보 열기' }).closest('tr')!;
    await flush(() => fireEvent.click(within(row).getByRole('button', { name: '에러 상세 보기' })));
    const modalRetry = screen.getByRole<HTMLButtonElement>('button', {
      name: '지금 재시도',
    });
    expect(modalRetry.disabled).toBe(true);
    await flush(() => fireEvent.click(modalRetry));
    expect(fixture.log.filter(r => r.name === 'RetryProductDescriptionJobOnAdmin')).toHaveLength(1);
    await flush(() => request.graphql());
    await waitFor(() => expect(modalRetry.disabled).toBe(false));
    expect(retryButton().disabled).toBe(false);
    await flush(() => fireEvent.click(modalRetry));
    const recovery = await fixture.take('RetryProductDescriptionJobOnAdmin');
    expect(recovery.variables).toEqual(request.variables);
    await flush(() => recovery.resolve(retryResult('recovered', 'fresh-slug')));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/products/fresh-slug?descriptionJobId=recovered'));
  });

  it.each(['network', 'graphql'] as const)(
    'keeps current %s failure explicit and permits retry recovery',
    async ending => {
      const fixture = setup();
      await fixture.lists();
      await flush(() => fireEvent.click(retryButton()));
      const failed = await fixture.take('RetryProductDescriptionJobOnAdmin');
      await flush(() => failed[ending]());
      await waitFor(() => expect(retryButton().disabled).toBe(false));
      expect(window.location.pathname).toBe('/llm-jobs');
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({ title: '재시도 요청 실패', color: 'red' })
      );
      await flush(() => fireEvent.click(retryButton()));
      const recovery = await fixture.take('RetryProductDescriptionJobOnAdmin');
      expect(failed.variables.requestId).toMatch(/^[a-f0-9-]{36}$/i);
      expect(recovery.variables).toEqual(failed.variables);
      await flush(() => recovery.resolve(retryResult()));
      await waitFor(() =>
        expect(push).toHaveBeenCalledWith('/products/renamed-address?descriptionJobId=new-logical-job')
      );
      expect(window.location.pathname + window.location.search).toBe(
        '/products/renamed-address?descriptionJobId=new-logical-job'
      );
    }
  );

  it.each(['success', 'network', 'graphql'] as const)(
    'does not let an old followup query %s clear a replacement wait',
    async ending => {
      push.mockImplementation(() => {});
      const fixture = setup();
      await fixture.lists();
      await flush(() => fireEvent.click(retryButton()));
      const first = await fixture.take('RetryProductDescriptionJobOnAdmin');
      await flush(() => first.resolve(retryResult()));
      const oldDescriptionQuery = await fixture.take('GetProductDescriptionJobsOnAdmin');
      const oldTranslationQuery = await fixture.take('GetTranslationJobsOnAdmin');
      await flush(() => fireEvent.click(retryButton('failed-B')));
      const replacement = await fixture.take('RetryProductDescriptionJobOnAdmin');
      const noticesBefore = vi.mocked(notifications.show).mock.calls.length;
      const requestsBefore = fixture.log.length;
      await flush(() => {
        oldTranslationQuery.resolve({ translationJobs: [] });
        if (ending === 'success')
          oldDescriptionQuery.resolve({
            productDescriptionJobs: [description(), description('failed-B', 'other-address')],
          });
        else oldDescriptionQuery[ending]();
      });
      expect(retryButton('failed-B').disabled).toBe(true);
      expect(push).toHaveBeenCalledTimes(1);
      expect(vi.mocked(notifications.show).mock.calls).toHaveLength(noticesBefore);
      expect(fixture.log).toHaveLength(requestsBefore);
      await flush(() => replacement.graphql());
      await waitFor(() => expect(retryButton('failed-B').disabled).toBe(false));
    }
  );

  it.each([
    [1, 'network'],
    [2, 'graphql'],
    [1, 'success'],
    [2, 'success'],
  ] as const)('번역 %s의 %s 응답이 다른 작업의 진행 상태를 지우지 않는다', async (first, ending) => {
    const fixture = setup();
    const rows = [translationRow(1, 'failed'), translationRow(2, 'failed')];
    await fixture.lists(rows);
    const button = (id: number) =>
      within(screen.getByTitle(`Product: entity-${id}`).closest('tr')!).getByRole<HTMLButtonElement>('button', {
        name: '재시도',
      });
    await flush(() => {
      fireEvent.click(button(1));
      fireEvent.click(button(1));
    });
    const a = await fixture.take('RetryTranslationJobOnAdmin');
    await flush(() => fireEvent.click(button(2)));
    const b = await fixture.take('RetryTranslationJobOnAdmin');
    expect(fixture.log.filter(r => r.name === 'RetryTranslationJobOnAdmin')).toHaveLength(2);
    expect(button(1).disabled).toBe(true);
    expect(button(2).disabled).toBe(true);
    const other = first === 1 ? 2 : 1;
    const request = first === 1 ? a : b;
    await flush(() => {
      if (ending === 'success')
        request.resolve({
          retryTranslationJob: translationRow(first, 'pending'),
        });
      else request[ending]();
    });
    if (ending === 'success') {
      await fixture.lists(rows);
    } else {
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '재시도 요청 실패',
          message: expect.stringContaining(`translation-${first}`),
        })
      );
    }
    await waitFor(() => expect(button(first).disabled).toBe(false));
    expect(button(other).disabled).toBe(true);
    await flush(() =>
      (first === 1 ? b : a).resolve({
        retryTranslationJob: translationRow(other, 'pending'),
      })
    );
    await fixture.lists(rows);
    await waitFor(() => expect(button(other).disabled).toBe(false));
    expect(push).not.toHaveBeenCalled();
  });

  it('같은 ID의 번역 재시도가 소개 재시도의 상세 이동을 무효화하지 않는다', async () => {
    const fixture = setup();
    const descriptions = await fixture.take('GetProductDescriptionJobsOnAdmin');
    const translations = await fixture.take('GetTranslationJobsOnAdmin');
    await flush(() => {
      descriptions.resolve({
        productDescriptionJobs: [description('translation-1')],
      });
      translations.resolve({ translationJobs: [translationRow(1, 'failed')] });
    });
    await flush(() => fireEvent.click(retryButton('translation-1')));
    const descriptionRequest = await fixture.take('RetryProductDescriptionJobOnAdmin');
    const translationButton = within(
      screen.getByTitle('Product: entity-1').closest('tr')!
    ).getByRole<HTMLButtonElement>('button', { name: '재시도' });
    expect(translationButton.disabled).toBe(false);
    await flush(() => fireEvent.click(translationButton));
    const translationRequest = await fixture.take('RetryTranslationJobOnAdmin');
    expect(retryButton('translation-1').disabled).toBe(true);
    expect(translationButton.disabled).toBe(true);
    await flush(() => descriptionRequest.resolve(retryResult()));
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith('/products/renamed-address?descriptionJobId=new-logical-job')
    );
    const noticeCount = vi.mocked(notifications.show).mock.calls.length;
    await flush(() => translationRequest.network());
    expect(vi.mocked(notifications.show).mock.calls).toHaveLength(noticeCount);
  });

  it.each(['success', 'network', 'graphql'] as const)('화면 이탈 뒤 번역 두 건의 %s 응답을 무시한다', async ending => {
    const fixture = setup();
    await fixture.lists([translationRow(1, 'failed'), translationRow(2, 'failed')]);
    for (const id of [1, 2]) {
      await flush(() =>
        fireEvent.click(
          within(screen.getByTitle(`Product: entity-${id}`).closest('tr')!).getByRole('button', { name: '재시도' })
        )
      );
    }
    const a = await fixture.take('RetryTranslationJobOnAdmin');
    const b = await fixture.take('RetryTranslationJobOnAdmin');
    await navigate('/settings/llm');
    const count = fixture.log.length;
    await flush(() => {
      for (const [index, request] of [a, b].entries()) {
        if (ending === 'success')
          request.resolve({
            retryTranslationJob: translationRow(index + 1, 'pending'),
          });
        else request[ending]();
      }
    });
    expect(notifications.show).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    expect(fixture.log).toHaveLength(count);
  });

  it('preserves current translation retry notification, list variables and refetch without navigation', async () => {
    const fixture = setup(true);
    await fixture.lists();
    const row = screen.getByText('product-2').closest('tr')!;
    const button = within(row).getByRole<HTMLButtonElement>('button', {
      name: '재시도',
    });
    await flush(() => fireEvent.click(button));
    const request = await fixture.take('RetryTranslationJobOnAdmin');
    expect(request.variables).toEqual({ id: 'translation-A' });
    expect(button.disabled).toBe(true);
    await flush(() =>
      request.resolve({
        retryTranslationJob: {
          __typename: 'TranslationJob',
          id: 'translation-new',
          entityType: 'Product',
          entityId: 'product-2',
          locale: 'en',
          status: 'pending',
          model: 'translator',
          message: null,
          error: null,
          createdAt: null,
          updatedAt: null,
        },
      })
    );
    expect(push).not.toHaveBeenCalled();
    expect(notifications.show).toHaveBeenCalledWith(expect.objectContaining({ title: '재시도 요청 성공' }));
    await fixture.lists();
    await waitFor(() =>
      expect(
        within(screen.getByText('product-2').closest('tr')!).getByRole<HTMLButtonElement>('button', { name: '재시도' })
          .disabled
      ).toBe(false)
    );
  });
});
