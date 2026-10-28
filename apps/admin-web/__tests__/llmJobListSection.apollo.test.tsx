// @vitest-environment jsdom
import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { GetTranslationJobsOnAdminDocument } from '@darun/provider-graphql';
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
        pending.push(request);
        log.push(request);
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
    async take(name: string) {
      await waitFor(() => expect(pending.some(request => request.name === name)).toBe(true));
      return pending.splice(
        pending.findIndex(request => request.name === name),
        1
      )[0]!;
    },
    async lists() {
      const descriptions = await this.take('GetProductDescriptionJobsOnAdmin');
      const translations = await this.take('GetTranslationJobsOnAdmin');
      expect(descriptions.variables).toEqual({ limit: 100, offset: 0 });
      expect(translations.variables).toEqual({ limit: 100, offset: 0 });
      await flush(() => {
        descriptions.resolve({
          productDescriptionJobs: [description(), description('failed-B', 'other-address')],
        });
        translations.resolve({
          translationJobs: translation
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
            : [],
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
  vi.clearAllMocks();
  window.history.replaceState(null, '', '/llm-jobs');
  push.mockImplementation((path: string) => {
    window.history.pushState(null, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
});
afterEach(() => {
  cleanup();
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
      expect(within(screen.getByTitle(`Product: entity-${count - 1}`)).getByText(`entity-${count - 1}`)).toBeTruthy()
    );
    await flush(() =>
      fireEvent.click(screen.getByText('영문 번역', { selector: 'button, button > span' }).closest('button')!)
    );
    return fixture;
  }

  it('loads translations beyond 100 with a bounded next-page request', async () => {
    const fixture = await firstTranslationPage();
    await flush(() =>
      fireEvent.click(screen.getByText('더 보기 (+100건)', { selector: 'button, button > span' }).closest('button')!)
    );
    const next = await fixture.take('GetTranslationJobsOnAdmin');
    expect(next.variables).toEqual({ limit: 100, offset: 100 });
    await flush(() => next.resolve({ translationJobs: [translationRow(100)] }));
    await waitFor(() => expect(within(screen.getByTitle('Product: entity-100')).getByText('entity-100')).toBeTruthy());
    expect(within(screen.getByTitle('Product: entity-0')).getByText('entity-0')).toBeTruthy();
    expect(screen.getByText('현재 101건 표시 중', { selector: 'span.tabular-nums' })).toBeTruthy();
    expect(fixture.log.filter(r => r.name === 'GetTranslationJobsOnAdmin').every(r => r.variables.limit === 100)).toBe(
      true
    );
  });

  it('refreshes every page of the already loaded translation list', async () => {
    const fixture = await firstTranslationPage(2);
    // The append case proves this aggregate is reachable; start at its real Apollo cache state to isolate refresh.
    await flush(() => {
      fixture.client.writeQuery({
        query: GetTranslationJobsOnAdminDocument,
        variables: { limit: 100, offset: 0 },
        data: {
          translationJobs: Array.from({ length: 101 }, (_, i) => translationRow(i)),
        },
      });
    });
    await waitFor(() =>
      expect(
        screen.getByText('현재 101건 표시 중', {
          selector: 'span.tabular-nums',
        })
      ).toBeTruthy()
    );
    await flush(() =>
      fireEvent.click(screen.getByText('새로고침', { selector: 'button, button > span' }).closest('button')!)
    );
    const refreshedFirst = await fixture.take('GetTranslationJobsOnAdmin');
    expect(refreshedFirst.variables).toEqual({ limit: 100, offset: 0 });
    await flush(() =>
      refreshedFirst.resolve({
        translationJobs: Array.from({ length: 100 }, (_, i) => translationRow(i)),
      })
    );
    const refreshedNext = await fixture.take('GetTranslationJobsOnAdmin');
    expect(refreshedNext.variables).toEqual({ limit: 100, offset: 100 });
    await flush(() => refreshedNext.resolve({ translationJobs: [translationRow(100)] }));
    expect(screen.getByText('현재 101건 표시 중', { selector: 'span.tabular-nums' })).toBeTruthy();
    expect(within(screen.getByTitle('Product: entity-0')).getByText('entity-0')).toBeTruthy();
    expect(within(screen.getByTitle('Product: entity-100')).getByText('entity-100')).toBeTruthy();
    expect(fixture.log.filter(r => r.name === 'GetTranslationJobsOnAdmin').every(r => r.variables.limit === 100)).toBe(
      true
    );
  });

  it('keeps the loaded rows after a failed next page and retries the same offset', async () => {
    const fixture = await firstTranslationPage(2);
    await flush(() =>
      fireEvent.click(screen.getByText('더 보기 (+100건)', { selector: 'button, button > span' }).closest('button')!)
    );
    const failed = await fixture.take('GetTranslationJobsOnAdmin');
    expect(failed.variables).toEqual({ limit: 100, offset: 2 });
    await flush(() => failed.network());
    await waitFor(() =>
      expect(notifications.show).toHaveBeenCalledWith(expect.objectContaining({ title: '목록 조회 실패' }))
    );
    expect(within(screen.getByTitle('Product: entity-1')).getByText('entity-1')).toBeTruthy();
    await flush(() =>
      fireEvent.click(screen.getByText('더 보기 (+100건)', { selector: 'button, button > span' }).closest('button')!)
    );
    const retry = await fixture.take('GetTranslationJobsOnAdmin');
    expect(retry.variables).toEqual({ limit: 100, offset: 2 });
    await flush(() => retry.resolve({ translationJobs: [translationRow(2)] }));
    await waitFor(() => expect(within(screen.getByTitle('Product: entity-2')).getByText('entity-2')).toBeTruthy());
    expect(within(screen.getByTitle('Product: entity-0')).getByText('entity-0')).toBeTruthy();
    expect(screen.getByText('현재 3건 표시 중', { selector: 'span.tabular-nums' })).toBeTruthy();
  });

  it('ignores the old next page after the status filter changes', async () => {
    const fixture = await firstTranslationPage(2);
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
      expect(old.variables).toEqual({ id: 'failed-A' });
      expect(retryButton().disabled).toBe(true);
      expect(retryButton('failed-B').disabled).toBe(false);
      await navigate('/settings/llm');
      expect(screen.getByRole('heading', { name: '다른 관리자 페이지' })).toBeTruthy();
      await navigate('/llm-jobs');
      await fixture.lists();
      await flush(() => fireEvent.click(retryButton()));
      const current = await fixture.take('RetryProductDescriptionJobOnAdmin');
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

  it('does not let a same-ID replacement lose its wait or recover old authority', async () => {
    const fixture = setup();
    await fixture.lists();
    await flush(() => fireEvent.click(retryButton()));
    const old = await fixture.take('RetryProductDescriptionJobOnAdmin');
    const row = screen.getByRole('link', { name: 'failed-A 소개 후보 열기' }).closest('tr')!;
    await flush(() => fireEvent.click(within(row).getByRole('button', { name: '에러 상세 보기' })));
    await flush(() => fireEvent.click(screen.getByRole('button', { name: '지금 재시도' })));
    const current = await fixture.take('RetryProductDescriptionJobOnAdmin');
    await flush(() => old.resolve(retryResult('obsolete')));
    expect(push).not.toHaveBeenCalled();
    expect(notifications.show).not.toHaveBeenCalled();
    expect(retryButton().disabled).toBe(true);
    await flush(() => current.graphql());
    await waitFor(() => expect(retryButton().disabled).toBe(false));
    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '재시도 요청 실패',
        message: '합성 GraphQL 실패',
      })
    );
    await flush(() => fireEvent.click(retryButton()));
    const recovery = await fixture.take('RetryProductDescriptionJobOnAdmin');
    await flush(() => recovery.resolve(retryResult('recovered', 'fresh-slug')));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/products/fresh-slug?descriptionJobId=recovered'));
    expect(window.location.pathname + window.location.search).toBe('/products/fresh-slug?descriptionJobId=recovered');
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
