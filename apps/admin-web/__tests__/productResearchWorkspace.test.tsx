// @vitest-environment jsdom
import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import type { Operation } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type TestGlobal = typeof globalThis & {
  researchNavigated?: string[];
  researchUploadForms?: Array<Record<string, FormDataEntryValue>>;
};

function testGlobal(): TestGlobal {
  return globalThis as TestGlobal;
}

vi.mock('@darun/utils-router', () => ({
  useNavigate: () => (to: string) => {
    const store = testGlobal();
    store.researchNavigated ??= [];
    store.researchNavigated.push(to);
  },
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn() },
}));

import { ProductResearchSection } from '../features/products/ProductResearchSection/ProductResearchSection';
import { RESEARCH_WORKSPACE_STORAGE_KEY } from '../features/products/ProductResearchSection/researchWorkspaceState';

function navigated(): string[] {
  const store = testGlobal();
  store.researchNavigated ??= [];
  return store.researchNavigated as string[];
}

const completedJob = {
  id: 'job-1',
  status: 'completed',
  errorCode: null,
  errorMessage: null,
  officialUrl: 'https://linear.app/',
  materializedProductId: null,
  result: {
    originalUrl: 'https://linear.app/',
    name: { value: 'Linear', anchors: [], evidenceType: 'OFFICIAL' },
    suggestedSlug: 'linear',
    summary: { value: '조사 요약', anchors: [], evidenceType: 'OFFICIAL' },
    features: [{ name: '이슈 추적', summary: '빠른 이슈 관리', emoji: '✨', anchors: [], evidenceType: 'OFFICIAL' }],
    tags: ['협업'],
    warnings: [],
    sources: [
      { id: 's1', title: 'Linear', url: 'https://linear.app/', hostname: 'linear.app', relationToInput: 'OFFICIAL' },
    ],
    companyCandidate: null,
    alternativeCandidates: [],
  },
};

const pendingJob = { ...completedJob, status: 'pending', result: null };

type Scenario = {
  jobResponses: unknown[];
  signInputs: unknown[];
  formInputs: Array<Record<string, FormDataEntryValue>>;
  materializeVars: unknown[];
  requestJobs: Array<{ id: string; officialUrl: string }>;
  requestDispatchStatuses: string[];
};

function makeClient(scenario: Scenario) {
  let jobCall = 0;
  let requestCall = 0;
  const link = new ApolloLink((operation: Operation) => {
    return new Observable(observer => {
      try {
        const name = operation.operationName;
        if (name === 'RequestProductResearchWorkspace') {
          const requestJob = scenario.requestJobs[Math.min(requestCall, scenario.requestJobs.length - 1)];
          requestCall += 1;
          observer.next({
            data: {
              requestProductResearch: {
                dispatchStatus: scenario.requestDispatchStatuses[0] ?? 'QUEUED',
                job: requestJob ?? { id: 'job-1', officialUrl: 'https://linear.app/' },
              },
            },
          });
        } else if (name === 'CategoriesOnResearchWorkspace') {
          observer.next({ data: { categories: [] } });
        } else if (name === 'ProductResearchJobWorkspace') {
          const response = scenario.jobResponses[Math.min(jobCall, scenario.jobResponses.length - 1)];
          jobCall += 1;
          observer.next({ data: { productResearchJob: response } });
        } else if (name === 'SignImageUpload') {
          scenario.signInputs.push(operation.variables);
          const input = (operation.variables as { input: { folder: string; displayName: string } }).input;
          observer.next({
            data: {
              signImageUpload: {
                __typename: 'SignImageUploadPayload',
                signature: 'sig-for-' + input.displayName,
                folder: input.folder,
                timestamp: 1700000000,
              },
            },
          });
        } else if (name === 'MaterializeResearchedProductWorkspace') {
          scenario.materializeVars.push(operation.variables);
          observer.next({
            data: { materializeResearchedProduct: { id: 'prod-1', slug: 'linear', name: 'Linear' } },
          });
        } else {
          throw new Error(`unexpected operation ${name}`);
        }
        observer.complete();
      } catch (error) {
        observer.error(error);
      }
    });
  });
  return new ApolloClient({ cache: new InMemoryCache(), link });
}

function newScenario(): Scenario {
  return {
    jobResponses: [pendingJob, completedJob],
    signInputs: [],
    formInputs: [],
    materializeVars: [],
    requestJobs: [{ id: 'job-1', officialUrl: 'https://linear.app/' }],
    requestDispatchStatuses: ['QUEUED'],
  };
}

function requestWorkspace() {
  fireEvent.change(screen.getAllByPlaceholderText('ex) https://linear.app')[0], {
    target: { value: 'https://linear.app/' },
  });
  fireEvent.click(
    within(screen.getByText('URL로 서비스 조사').closest('div')!.parentElement as HTMLElement).getByRole('button', {
      name: '조사 요청',
    })
  );
}

beforeEach(() => {
  navigated().length = 0;
  window.localStorage.clear();
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = 'demo-cloud';
  process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY = 'demo-key';
  testGlobal().researchUploadForms = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: unknown, init?: { body?: unknown }) => {
      const body = init?.body as FormData;
      const entries: Record<string, FormDataEntryValue> = {};
      body.forEach((value, key) => {
        entries[key] = value;
      });
      const store = testGlobal();
      store.researchUploadForms ??= [];
      store.researchUploadForms.push(entries);
      return {
        ok: true,
        json: async () => ({ secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/logo.png' }),
      };
    })
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function formInputs(): Array<Record<string, FormDataEntryValue>> {
  return testGlobal().researchUploadForms ?? [];
}

describe('admin research workspace flow', () => {
  it('URL 요청 후 Review가 표시되고 새로고침 후 Job과 편집값이 복구된다', async () => {
    const scenario = newScenario();
    render(
      <ApolloProvider client={makeClient(scenario)}>
        <ProductResearchSection />
      </ApolloProvider>
    );
    requestWorkspace();

    await waitFor(() => expect(screen.queryByText(/제안 slug/)?.textContent).toContain('linear'), { timeout: 8000 });
    expect(screen.getByText('근거 출처')).toBeTruthy();

    const stored = JSON.parse(window.localStorage.getItem(RESEARCH_WORKSPACE_STORAGE_KEY) ?? '{}');
    expect(stored.jobId).toBe('job-1');
    expect(stored.officialUrl).toBe('https://linear.app/');

    // Review 편집 후 새로고침 시뮬레이션: 동일 localStorage로 다시 마운트하면 복구된다.
    fireEvent.change(screen.getByDisplayValue('Linear'), { target: { value: 'Linear 편집' } });
    await waitFor(() =>
      expect(JSON.parse(window.localStorage.getItem(RESEARCH_WORKSPACE_STORAGE_KEY) ?? '{}').review.name).toBe(
        'Linear 편집'
      )
    );

    cleanup();
    const scenario2 = newScenario();
    scenario2.jobResponses = [completedJob];
    render(
      <ApolloProvider client={makeClient(scenario2)}>
        <ProductResearchSection />
      </ApolloProvider>
    );
    await waitFor(() => expect(screen.queryByText(/제안 slug/)?.textContent).toContain('linear'), { timeout: 8000 });
    expect((screen.getByDisplayValue('Linear 편집') as HTMLInputElement).value).toBe('Linear 편집');
    expect(screen.queryByText(/작업 ID: job-1/)?.textContent).toContain('job-1');
  });

  it('Review 편집 후 실제 업로드 훅으로 미발행 생성이 끝나고 상세로 이동한다', async () => {
    const scenario = newScenario();
    render(
      <ApolloProvider client={makeClient(scenario)}>
        <ProductResearchSection />
      </ApolloProvider>
    );
    requestWorkspace();
    await waitFor(() => expect(screen.queryByText(/제안 slug/)?.textContent).toContain('linear'), { timeout: 8000 });

    fireEvent.change(screen.getByDisplayValue('Linear'), { target: { value: 'Linear 편집' } });

    const file = new File(['logo'], 'logo.png', { type: 'image/png' });
    fireEvent.change(document.querySelector('input[name="review-logo-file"]') as HTMLInputElement, {
      target: { files: [file] },
    });

    fireEvent.click(screen.getByRole('button', { name: '검토 내용으로 미발행 생성' }));

    await waitFor(() => expect(navigated()).toEqual(['/products/linear']), { timeout: 8000 });

    // 실제 useImageUpload 경로: 서명 입력과 Cloudinary 전송 public_id가 동일하고 slug가 아니다.
    expect(scenario.signInputs).toHaveLength(1);
    const signedDisplayName = (scenario.signInputs[0] as { input: { folder: string; displayName: string } }).input
      .displayName;
    expect(signedDisplayName).not.toBe('linear');
    expect(signedDisplayName.startsWith('linear-')).toBe(true);
    expect(formInputs()).toHaveLength(1);
    expect(formInputs()[0]['public_id']).toBe(signedDisplayName);
    expect(formInputs()[0]['signature']).toBe('sig-for-' + signedDisplayName);
    expect(scenario.materializeVars).toHaveLength(1);
  });

  it('새 Job 전환 시 Review 편집값·로고 선택·미리보기가 초기화된다', async () => {
    const scenario = newScenario();
    scenario.requestJobs = [
      { id: 'job-1', officialUrl: 'https://linear.app/' },
      { id: 'job-2', officialUrl: 'https://notion.so/' },
    ];
    scenario.jobResponses = [completedJob, { ...completedJob, id: 'job-2', officialUrl: 'https://notion.so/' }];
    render(
      <ApolloProvider client={makeClient(scenario)}>
        <ProductResearchSection />
      </ApolloProvider>
    );
    requestWorkspace();
    await waitFor(() => expect(screen.queryByText(/제안 slug/)?.textContent).toContain('linear'), { timeout: 8000 });

    fireEvent.change(screen.getByDisplayValue('Linear'), { target: { value: 'Linear 편집' } });
    fireEvent.change(screen.getByPlaceholderText('https://...'), { target: { value: 'https://x/logo.png' } });

    fireEvent.change(screen.getAllByPlaceholderText('ex) https://linear.app')[0], {
      target: { value: 'https://notion.so/' },
    });
    fireEvent.click(
      within(screen.getByText('URL로 서비스 조사').closest('div')!.parentElement as HTMLElement).getByRole('button', {
        name: '조사 요청',
      })
    );

    await waitFor(() => expect(screen.queryByText(/작업 ID: job-2/)?.textContent).toContain('job-2'), {
      timeout: 8000,
    });
    expect(screen.queryByDisplayValue('Linear 편집')).toBeNull();
    expect(screen.queryByDisplayValue('https://x/logo.png')).toBeNull();
  });

  it('서명 실패 후 입력이 보존되고 재시도할 수 있다', async () => {
    const scenario = newScenario();
    scenario.jobResponses = [completedJob];
    testGlobal().researchUploadForms = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        json: async () => ({ error: { message: 'upload rejected' } }),
      }))
    );
    render(
      <ApolloProvider client={makeClient(scenario)}>
        <ProductResearchSection />
      </ApolloProvider>
    );
    // 저장값 없이 completed Job을 직접 주입: 요청 없이 Review 경로를 타지 않으므로 요청부터 시작한다.
    requestWorkspace();
    await waitFor(() => expect(screen.queryByText(/제안 slug/)?.textContent).toContain('linear'), { timeout: 8000 });

    fireEvent.change(screen.getByDisplayValue('Linear'), { target: { value: 'Linear 유지' } });
    const file = new File(['logo'], 'logo.png', { type: 'image/png' });
    fireEvent.change(document.querySelector('input[name="review-logo-file"]') as HTMLInputElement, {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole('button', { name: '검토 내용으로 미발행 생성' }));

    await waitFor(() => expect(scenario.signInputs).toHaveLength(1), { timeout: 8000 });
    await waitFor(() => expect(navigated()).toEqual([]), { timeout: 2000 }).catch(() => undefined);
    // 실패해도 편집값은 그대로 남는다.
    expect((screen.getByDisplayValue('Linear 유지') as HTMLInputElement).value).toBe('Linear 유지');
    expect(scenario.materializeVars).toHaveLength(0);
  });

  it('로고 미리보기 변경 중에도 폴 타이머가 유지되고 완료 시에만 중단된다', async () => {
    const scenario = newScenario();
    scenario.jobResponses = [pendingJob, pendingJob, completedJob];
    const createdIntervals: unknown[] = [];
    const clearedIntervals: unknown[] = [];
    const rawSetInterval = globalThis.setInterval.bind(globalThis);
    const rawClearInterval = globalThis.clearInterval.bind(globalThis);
    const setSpy = vi.spyOn(globalThis, 'setInterval').mockImplementation(((handler: () => void, ms?: number) => {
      const handle = rawSetInterval(handler, ms);
      createdIntervals.push(handle);
      return handle;
    }) as typeof setInterval);
    const clearSpy = vi.spyOn(globalThis, 'clearInterval').mockImplementation(((handle?: unknown) => {
      clearedIntervals.push(handle);
      return rawClearInterval(handle as never);
    }) as typeof clearInterval);
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
    const { unmount } = render(
      <ApolloProvider client={makeClient(scenario)}>
        <ProductResearchSection />
      </ApolloProvider>
    );
    requestWorkspace();
    await waitFor(() => expect(screen.queryByText(/작업 ID: job-1/)?.textContent).toContain('job-1'), {
      timeout: 8000,
    });
    await waitFor(() => expect(screen.getByRole('button', { name: '자동 확인 중...' })).toBeTruthy(), {
      timeout: 8000,
    });
    const pollHandle = createdIntervals[createdIntervals.length - 1];
    expect(pollHandle).toBeTruthy();
    // pollJob 시작 시 이전 타이머 정리 외에 무관한 입력 변경으로 정리되지 않는다.
    const clearedBeforeInputChange = clearedIntervals.length;

    // 폴링 활성 중 무관한 입력 변경이 타이머를 중단하지 않는다.
    fireEvent.change(screen.getAllByPlaceholderText('ex) https://linear.app')[0], {
      target: { value: 'https://linear.app/docs' },
    });
    expect(screen.getByRole('button', { name: '자동 확인 중...' })).toBeTruthy();
    expect(clearedIntervals.length).toBe(clearedBeforeInputChange);

    // 완료 상태에서만 폴링이 중단되고 Review가 표시된다.
    await waitFor(() => expect(screen.queryByText(/제안 slug/)?.textContent).toContain('linear'), {
      timeout: 15000,
    });
    await waitFor(() => expect(screen.getByRole('button', { name: '결과 새로고침' })).toBeTruthy(), {
      timeout: 8000,
    });
    expect(clearedIntervals).toContain(pollHandle);

    // 미리보기 변경은 이전 미리보기 URL만 해제하고 폴 타이머 정리와 분리된다.
    const fileInput = () => document.querySelector('input[name="review-logo-file"]') as HTMLInputElement;
    fireEvent.change(fileInput(), { target: { files: [new File(['one'], 'one.png', { type: 'image/png' })] } });
    const firstPreview = (await screen.findByAltText('조사 로고 미리보기')).getAttribute('src');
    expect(firstPreview).toBeTruthy();
    const pollClearsBeforePreviewChange = clearedIntervals.filter(handle => handle === pollHandle).length;
    fireEvent.change(fileInput(), { target: { files: [new File(['two'], 'two.png', { type: 'image/png' })] } });
    await waitFor(() => expect(screen.getByAltText('조사 로고 미리보기').getAttribute('src')).not.toBe(firstPreview));
    expect(revokeSpy).toHaveBeenCalledWith(firstPreview);
    expect(clearedIntervals.filter(handle => handle === pollHandle).length).toBe(pollClearsBeforePreviewChange);

    // 언마운트 시 폴 타이머 정리는 별도 effect에서 수행된다.
    unmount();
    revokeSpy.mockRestore();
    setSpy.mockRestore();
    clearSpy.mockRestore();
  }, 20000);

  it('jobId가 바뀐 뒤 도착한 이전 Job 응답이 현재 Review prefill을 덮어쓰지 않는다', async () => {
    const staleJob = { ...completedJob, id: 'job-stale', officialUrl: 'https://stale.example/' };
    const staleResult = {
      ...(staleJob.result as Record<string, unknown>),
      name: { value: 'Stale', anchors: [], evidenceType: 'OFFICIAL' },
      suggestedSlug: 'stale',
    };
    const currentJob = { ...completedJob, id: 'job-current', officialUrl: 'https://linear.app/' };
    const scenario = newScenario();
    scenario.requestJobs = [
      { id: 'job-stale', officialUrl: 'https://stale.example/' },
      { id: 'job-current', officialUrl: 'https://linear.app/' },
    ];
    let releaseFirstFetch: (() => void) | undefined;
    const firstFetchGate = new Promise<void>(resolve => {
      releaseFirstFetch = () => resolve();
    });
    const pollingLink = new ApolloLink((operation: Operation) => {
      return new Observable(observer => {
        const name = operation.operationName;
        if (name === 'ProductResearchJobWorkspace') {
          const requestedId = (operation.variables as { id?: string }).id;
          if (requestedId === 'job-stale') {
            void firstFetchGate.then(() => {
              observer.next({ data: { productResearchJob: { ...staleJob, result: staleResult } } });
              observer.complete();
            });
            return;
          }
          observer.next({ data: { productResearchJob: currentJob } });
          observer.complete();
          return;
        }
        if (name === 'RequestProductResearchWorkspace') {
          const next = scenario.requestJobs.shift() ?? { id: 'job-current', officialUrl: 'https://linear.app/' };
          observer.next({
            data: { requestProductResearch: { dispatchStatus: 'QUEUED', job: next } },
          });
          observer.complete();
          return;
        }
        if (name === 'CategoriesOnResearchWorkspace') {
          observer.next({ data: { categories: [] } });
          observer.complete();
        }
      });
    });
    const gatedClient = new ApolloClient({ cache: new InMemoryCache(), link: pollingLink });
    render(
      <ApolloProvider client={gatedClient}>
        <ProductResearchSection />
      </ApolloProvider>
    );

    fireEvent.change(screen.getAllByPlaceholderText('ex) https://linear.app')[0], {
      target: { value: 'https://stale.example/' },
    });
    fireEvent.click(
      within(screen.getByText('URL로 서비스 조사').closest('div')!.parentElement as HTMLElement).getByRole('button', {
        name: '조사 요청',
      })
    );
    await waitFor(() => expect(screen.queryByText(/작업 ID: job-stale/)?.textContent).toContain('job-stale'), {
      timeout: 8000,
    });

    // 새 Job 요청을 먼저 전환한 뒤 이전 Job 응답을 뒤늦게 도착시킨다.
    fireEvent.change(screen.getAllByPlaceholderText('ex) https://linear.app')[0], {
      target: { value: 'https://linear.app/' },
    });
    fireEvent.click(
      within(screen.getByText('URL로 서비스 조사').closest('div')!.parentElement as HTMLElement).getByRole('button', {
        name: '조사 요청',
      })
    );
    await waitFor(() => expect(screen.queryByText(/작업 ID: job-current/)?.textContent).toContain('job-current'), {
      timeout: 8000,
    });
    releaseFirstFetch?.();
    await waitFor(() => expect(screen.queryByText(/제안 slug/)?.textContent).toContain('linear'), { timeout: 8000 });
    // 뒤늦게 도착한 이전 Job 결과가 현재 Review를 덮어쓰지 않는다.
    expect(screen.queryByDisplayValue('Stale')).toBeNull();
    expect((screen.getByDisplayValue('Linear') as HTMLInputElement).value).toBe('Linear');
  });

  it('동일 폼 연속 제출 경합에서 먼저 도착한 이전 제출 응답이 최신 Job을 덮어쓰지 않는다', async () => {
    const firstJob = {
      ...completedJob,
      id: 'job-first',
      officialUrl: 'https://first.example/',
      result: {
        ...(completedJob.result as Record<string, unknown>),
        name: { value: 'First', anchors: [], evidenceType: 'OFFICIAL' },
        suggestedSlug: 'first',
      },
    };
    const secondJob = { ...completedJob, id: 'job-second', officialUrl: 'https://second.example/' };
    const requestResolvers: Array<() => void> = [];
    const racedLink = new ApolloLink((operation: Operation) => {
      return new Observable(observer => {
        const name = operation.operationName;
        if (name === 'RequestProductResearchWorkspace') {
          const url = (operation.variables as { input: { officialUrl: string } }).input.officialUrl;
          const job = url === 'https://second.example/' ? secondJob : firstJob;
          const dispatchStatus = url === 'https://second.example/' ? 'QUEUED' : 'RETRY_REQUIRED';
          requestResolvers.push(() => {
            observer.next({ data: { requestProductResearch: { dispatchStatus, job } } });
            observer.complete();
          });
          return;
        }
        if (name === 'ProductResearchJobWorkspace') {
          const requestedId = (operation.variables as { id?: string }).id;
          observer.next({
            data: { productResearchJob: requestedId === 'job-first' ? firstJob : secondJob },
          });
          observer.complete();
          return;
        }
        if (name === 'CategoriesOnResearchWorkspace') {
          observer.next({ data: { categories: [] } });
          observer.complete();
        }
      });
    });
    render(
      <ApolloProvider client={new ApolloClient({ cache: new InMemoryCache(), link: racedLink })}>
        <ProductResearchSection />
      </ApolloProvider>
    );

    const form = screen
      .getByText('URL로 서비스 조사')
      .closest('div')!
      .parentElement!.querySelector('form') as HTMLFormElement;
    const urlInput = screen.getAllByPlaceholderText('ex) https://linear.app')[0] as HTMLInputElement;
    // 버튼 disabled 렌더 이전의 연속 제출을 재현하려고 폼 submit을 직접 두 번 보낸다.
    fireEvent.change(urlInput, { target: { value: 'https://first.example/' } });
    fireEvent.submit(form);
    fireEvent.change(urlInput, { target: { value: 'https://second.example/' } });
    fireEvent.submit(form);
    await waitFor(() => expect(requestResolvers).toHaveLength(2), { timeout: 8000 });

    // 먼저 제출된 요청의 응답을 먼저 도착시킨다. 최신 제출이 아니므로 무시되어야 한다.
    requestResolvers[0]();
    await waitFor(() => expect(screen.queryByText(/작업 ID/)?.textContent).toBeUndefined(), { timeout: 2000 }).catch(
      () => undefined
    );
    expect(screen.queryByText(/작업 ID: job-first/)).toBeNull();

    // 늦게 제출된 요청의 응답이 도착하면 최신 Job이 차지한다.
    requestResolvers[1]();
    await waitFor(() => expect(screen.queryByText(/작업 ID: job-second/)?.textContent).toContain('job-second'), {
      timeout: 8000,
    });
    await waitFor(() => expect(screen.queryByText(/제안 slug/)?.textContent).toContain('linear'), { timeout: 8000 });
    expect(screen.queryByDisplayValue('First')).toBeNull();
    expect((screen.getByDisplayValue('Linear') as HTMLInputElement).value).toBe('Linear');
    expect(screen.queryByText(/전송 상태: QUEUED/)?.textContent).toContain('QUEUED');
    expect(JSON.parse(window.localStorage.getItem(RESEARCH_WORKSPACE_STORAGE_KEY) ?? '{}').jobId).toBe('job-second');
  });
});
