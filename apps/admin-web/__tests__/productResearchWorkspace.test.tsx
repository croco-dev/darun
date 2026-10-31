// @vitest-environment jsdom
import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import type { Operation } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { notifications } from '@mantine/notifications';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { GraphQLError } from 'graphql';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type TestGlobal = typeof globalThis & {
  researchNavigated?: string[];
  researchUploadForms?: Array<Record<string, FormDataEntryValue>>;
  researchSearchParams?: Record<string, string>;
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
  useSearchParams: () => {
    const params = testGlobal().researchSearchParams ?? {};
    return {
      get: (key: string) => params[key] ?? null,
    };
  },
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn() },
}));

import { ProductResearchSection } from '../features/products/ProductResearchSection/ProductResearchSection';
import {
  listWorkspaceDrafts,
  readWorkspaceDraft,
} from '../features/products/ProductResearchSection/researchWorkspaceDrafts';
import { RESEARCH_WORKSPACE_STORAGE_KEY } from '../features/products/ProductResearchSection/researchWorkspaceState';

function readSavedWorkspace(key: string): string | null {
  const jobId = key.startsWith(`${RESEARCH_WORKSPACE_STORAGE_KEY}:`)
    ? key.slice(RESEARCH_WORKSPACE_STORAGE_KEY.length + 1)
    : undefined;
  const workspace = readWorkspaceDraft(window.localStorage, window.sessionStorage, jobId);
  return workspace ? JSON.stringify(workspace) : null;
}

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
    categoryCandidates: [],
  },
};

const pendingJob = { ...completedJob, status: 'pending', result: null };

type Scenario = {
  jobResponses: unknown[];
  jobQueries: string[];
  signInputs: unknown[];
  formInputs: Array<Record<string, FormDataEntryValue>>;
  materializeVars: unknown[];
  requestJobs: Array<{ id: string; officialUrl: string }>;
  requestInputs: Array<{ requestId: string; officialUrl: string }>;
  retryInputs: unknown[];
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
          scenario.requestInputs.push(operation.variables.input);
          requestCall += 1;
          observer.next({
            data: {
              requestProductResearch: {
                status: 'pending',
                errorCode: null,
                errorMessage: null,
                ...(requestJob ?? { id: 'job-1', officialUrl: 'https://linear.app/' }),
              },
            },
          });
        } else if (name === 'RetryProductResearchWorkspace') {
          scenario.retryInputs.push(operation.variables);
          observer.next({
            data: {
              retryProductResearch: {
                status: 'pending',
                errorCode: null,
                errorMessage: null,
                ...scenario.requestJobs[0],
              },
            },
          });
        } else if (name === 'CategoriesOnResearchWorkspace') {
          observer.next({ data: { categories: [] } });
        } else if (name === 'ProductResearchJobWorkspace') {
          const response = scenario.jobResponses[Math.min(jobCall, scenario.jobResponses.length - 1)];
          scenario.jobQueries.push(operation.variables.id);
          jobCall += 1;
          void Promise.resolve(response).then(value => {
            if (value instanceof GraphQLError) {
              observer.next({ data: { productResearchJob: null }, errors: [value] });
            } else if (value instanceof Error) {
              observer.error(value);
              return;
            } else {
              observer.next({ data: { productResearchJob: value } });
            }
            observer.complete();
          });
          return;
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
    jobQueries: [],
    signInputs: [],
    formInputs: [],
    materializeVars: [],
    requestJobs: [{ id: 'job-1', officialUrl: 'https://linear.app/' }],
    requestInputs: [],
    retryInputs: [],
  };
}

type ResearchRequestVariables = { requestId: string; officialUrl: string };
type ResearchRetryVariables = { jobId: string; input?: { requestId?: string } };

type RaceActionCall<TVariables> = {
  variables: TVariables;
  respond: (job?: RaceJobIdentity) => void;
  fail: (error: Error) => void;
};

type RaceMaterializeCall = {
  variables: { input: { researchJobId: string; name: string; slug: string; logoUrl: string; tags: string[] } };
  respond: (product?: { id: string; slug: string; name: string }) => void;
  fail: (error: Error) => void;
};

type RaceLookupCall = {
  id: string;
  respond: (job: unknown) => void;
  fail: (error: Error) => void;
};

const failedRaceJob = {
  ...completedJob,
  id: 'job-1',
  status: 'failed',
  errorCode: 'SEARCH_FAILED',
  errorMessage: '합성 조사 실패',
  result: null,
};
const retryRaceJob = { ...pendingJob, id: 'job-retry', officialUrl: 'https://linear.app/' };
const requestedRaceJob = { ...pendingJob, id: 'job-new', officialUrl: 'https://notion.so/' };

type RaceJobIdentity = { id: string; officialUrl: string };

// 실제 ApolloClient·InMemoryCache·useMutation/useLazyQuery를 유지한 채 action 응답 순서만 제어하는 합성 ApolloLink seam이다.
function makeRaceClient(handlers: {
  requestJobs: Record<string, RaceJobIdentity>;
  retryJobs: Record<string, RaceJobIdentity>;
  jobs: Record<string, unknown>;
  requests: RaceActionCall<ResearchRequestVariables>[];
  retries: RaceActionCall<ResearchRetryVariables>[];
  lookups: string[];
  materializations?: RaceMaterializeCall[];
  lookupCalls?: RaceLookupCall[];
  categories?: Array<{ id: string; slug: string; labelKo: string; labelEn: string }>;
}) {
  const link = new ApolloLink((operation: Operation) => {
    return new Observable(observer => {
      const respond = (data: Record<string, unknown>) => {
        observer.next({ data });
        observer.complete();
      };
      const fail = (error: Error) => {
        if (error instanceof GraphQLError) {
          observer.next({ errors: [error] });
          observer.complete();
        } else {
          observer.error(error);
        }
      };
      const name = operation.operationName;
      if (name === 'RequestProductResearchWorkspace') {
        // Apollo의 Operation.variables는 shape가 없는 Record이므로 이 seam의 요청 shape로 좁힌다.
        const variables = operation.variables as { input: ResearchRequestVariables };
        const input = variables.input;
        handlers.requests.push({
          variables: input,
          respond: job =>
            respond({
              requestProductResearch: {
                status: 'pending',
                errorCode: null,
                errorMessage: null,
                ...(job ?? handlers.requestJobs[input.officialUrl]),
              },
            }),
          fail,
        });
        return;
      }
      if (name === 'RetryProductResearchWorkspace') {
        // Apollo의 Operation.variables는 shape가 없는 Record이므로 retry 요청 shape로 좁힌다.
        const variables = operation.variables as ResearchRetryVariables;
        handlers.retries.push({
          variables,
          respond: () =>
            respond({
              retryProductResearch: {
                status: 'pending',
                errorCode: null,
                errorMessage: null,
                ...handlers.retryJobs[variables.jobId],
              },
            }),
          fail,
        });
        return;
      }
      if (name === 'ProductResearchJobWorkspace') {
        // Apollo의 Operation.variables는 shape가 없는 Record이므로 조회 id shape로 좁힌다.
        const variables = operation.variables as { id: string };
        const id = variables.id;
        handlers.lookups.push(id);
        if (handlers.lookupCalls) {
          handlers.lookupCalls.push({ id, respond: job => respond({ productResearchJob: job }), fail });
          return;
        }
        void Promise.resolve(handlers.jobs[id]).then(job => respond({ productResearchJob: job }));
        return;
      }
      if (name === 'MaterializeResearchedProductWorkspace' && handlers.materializations) {
        handlers.materializations.push({
          variables: operation.variables as RaceMaterializeCall['variables'],
          respond: (product = { id: 'prod-stale', slug: 'stale', name: '이전 등록' }) =>
            respond({ materializeResearchedProduct: product }),
          fail,
        });
        return;
      }
      if (name === 'SignImageUpload') {
        const input = operation.variables.input as { folder: string; displayName: string };
        respond({
          signImageUpload: { signature: `sig-${input.displayName}`, folder: input.folder, timestamp: 1700000000 },
        });
        return;
      }
      if (name === 'CategoriesOnResearchWorkspace') {
        respond({ categories: handlers.categories ?? [] });
        return;
      }
      throw new Error(`unexpected operation ${name}`);
    });
  });
  return new ApolloClient({ cache: new InMemoryCache(), link });
}

// 실패한 job-1의 사람 편집·로고가 든 job별 저장 상태를 복원한다.
function seedResearchWorkspace() {
  const stored = {
    version: 1,
    requestId: 'stored-request',
    officialUrl: 'https://linear.app/',
    jobId: 'job-1',
    review: {
      name: '사람 이름',
      slug: 'human-slug',
      summary: '사람 요약',
      logoUrl: 'https://linear.app/logo.png',
      officialUrl: 'https://linear.app/',
      categoryIds: [],
      features: [],
      tags: [],
    },
    logoFileName: 'human-logo.png',
    uploadedLogoUrl: 'https://res.cloudinary.com/demo/image/upload/v1/human-logo.png',
    materializedSlug: null,
  };
  window.localStorage.setItem(RESEARCH_WORKSPACE_STORAGE_KEY, JSON.stringify(stored));
  return stored;
}

function submitResearchRequest(url: string) {
  fireEvent.change(screen.getAllByPlaceholderText('ex) https://linear.app')[0], {
    target: { value: url },
  });
  fireEvent.click(
    within(screen.getByText('URL로 서비스 조사').closest('div')!.parentElement as HTMLElement).getByRole('button', {
      name: '조사 요청',
    })
  );
}

// 후속 promise 연쇄가 settle할 때까지 macrotask를 한 번 넘긴다.
function nextTurn(ms = 0) {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, ms);
  return promise;
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

function renderResearchRace({
  jobs = { 'job-1': failedRaceJob, 'job-retry': retryRaceJob, 'job-new': requestedRaceJob },
  searchParams = { researchJobId: 'job-1' },
  materializations,
  lookupCalls,
}: {
  jobs?: Record<string, unknown>;
  searchParams?: Record<string, string>;
  materializations?: RaceMaterializeCall[];
  lookupCalls?: RaceLookupCall[];
} = {}) {
  const stored = seedResearchWorkspace();
  testGlobal().researchSearchParams = searchParams;
  const requests: RaceActionCall<ResearchRequestVariables>[] = [];
  const retries: RaceActionCall<ResearchRetryVariables>[] = [];
  const lookups: string[] = [];
  const client = makeRaceClient({
    requestJobs: { 'https://notion.so/': requestedRaceJob },
    retryJobs: { 'job-1': retryRaceJob },
    jobs,
    requests,
    retries,
    materializations,
    lookups,
    lookupCalls,
  });
  const view = render(
    <ApolloProvider client={client}>
      <ProductResearchSection />
    </ApolloProvider>
  );
  return { stored, requests, retries, lookups, jobs, client, view };
}

async function startFailedResearchRetry(retries: RaceActionCall<ResearchRetryVariables>[]) {
  fireEvent.click(await screen.findByRole('button', { name: '실패 작업 재조사' }));
  await waitFor(() => expect(retries).toHaveLength(1));
}

async function renderCompletedResearch(logoFile?: File, lookupCalls?: RaceLookupCall[]) {
  const materializations: RaceMaterializeCall[] = [];
  const race = renderResearchRace({
    jobs: { 'job-1': completedJob, 'job-new': requestedRaceJob },
    searchParams: testGlobal().researchSearchParams,
    materializations,
    lookupCalls,
  });
  if (lookupCalls) {
    await waitFor(() => expect(lookupCalls).toHaveLength(1));
    lookupCalls[0].respond(completedJob);
  }
  await screen.findByText(/작업 ID: job-1 · 상태: completed/);
  if (logoFile) {
    fireEvent.change(document.querySelector('[name="review-logo-file"]')!, { target: { files: [logoFile] } });
  }
  return { ...race, materializations };
}

async function renderMaterializeRace(logoFile?: File) {
  const race = await renderCompletedResearch(logoFile);
  const { stored, materializations } = race;
  fireEvent.click(screen.getByRole('button', { name: '검토 내용으로 미발행 생성' }));
  if (logoFile) {
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(materializations).toHaveLength(0);
  } else {
    await waitFor(() => expect(materializations).toHaveLength(1));
    expect(materializations[0].variables.input).toMatchObject({
      researchJobId: 'job-1',
      name: stored.review.name,
      slug: stored.review.slug,
      logoUrl: stored.review.logoUrl,
    });
  }
  return race;
}

// 등록은 commit됐지만 응답은 유실된 뒤, 같은 Apollo client와 저장 검토로 researchJobId에 재진입한다.
async function renderMaterializedReentry() {
  const race = await renderMaterializeRace();
  race.jobs['job-1'] = { ...completedJob, materializedProductId: 'prod-existing' };
  race.materializations[0].fail(new Error('등록 응답 유실'));
  expect((await screen.findByRole('alert')).textContent).toContain('등록 응답 유실');
  expect(JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!).materializedSlug).toBeNull();
  race.view.unmount();
  testGlobal().researchSearchParams = { researchJobId: 'job-1' };
  const view = render(
    <ApolloProvider client={race.client}>
      <ProductResearchSection />
    </ApolloProvider>
  );
  await screen.findByText(/작업 ID: job-1 · 상태: completed/);
  await waitFor(() => expect(race.lookups).toEqual(['job-1', 'job-1']));
  expect((document.querySelector('[name="review-name"]') as HTMLInputElement).value).toBe(race.stored.review.name);
  expect((document.querySelector('[name="review-slug"]') as HTMLInputElement).value).toBe(race.stored.review.slug);
  expect(JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!).review).toEqual(race.stored.review);
  expect(screen.queryByRole('alert')).toBeNull();
  expect(race.materializations).toHaveLength(1);
  expect(race.requests).toHaveLength(0);
  expect(race.retries).toHaveLength(0);
  expect(navigated()).toEqual([]);
  expect(notifications.show).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
  return { ...race, view };
}

function finishStaleMaterialization(call: RaceMaterializeCall, outcome: string) {
  if (outcome === 'success') call.respond();
  else if (outcome === 'GraphQL') call.fail(new GraphQLError('이전 등록 GraphQL 실패'));
  else call.fail(new Error('이전 등록 network 실패'));
}

function finishStaleRequest(call: RaceActionCall<ResearchRequestVariables>, outcome: string) {
  if (outcome === 'success') call.respond();
  else if (outcome === 'GraphQL') call.fail(new GraphQLError('이전 요청 GraphQL 실패'));
  else call.fail(new Error('이전 요청 network 실패'));
}

async function renderSubmissionReview() {
  const stored = seedResearchWorkspace();
  stored.review.officialUrl = 'https://linear.app/reviewed';
  const review = {
    ...stored.review,
    categoryIds: ['cat-reviewed'],
    features: [{ name: '검토한 기능', summary: '검토한 기능 설명', emoji: '🔎' }],
    tags: ['검토한 태그'],
  };
  window.localStorage.setItem(RESEARCH_WORKSPACE_STORAGE_KEY, JSON.stringify({ ...stored, review }));
  const materializations: RaceMaterializeCall[] = [];
  const client = makeRaceClient({
    requestJobs: {},
    retryJobs: {},
    jobs: { 'job-1': completedJob },
    requests: [],
    retries: [],
    lookups: [],
    materializations,
    categories: [
      {
        id: 'cat-reviewed',
        slug: 'reviewed',
        labelKo: '검토한 분류',
        labelEn: 'Reviewed',
      },
    ],
  });
  render(
    <ApolloProvider client={client}>
      <ProductResearchSection />
    </ApolloProvider>
  );
  await screen.findByRole('textbox', { name: '기능 1 이름' });
  fireEvent.click(
    screen.getByRole('checkbox', {
      name: '변경한 URL이 공식 사이트인지 직접 확인했습니다.',
    })
  );
  const form = screen.getByRole('button', { name: '검토 내용으로 미발행 생성' }).closest('form')!;
  return { review, materializations, form };
}

function expectReviewDisabled(form: HTMLFormElement, disabled: boolean) {
  const controls = Array.from(form.querySelectorAll('input, textarea, button'));
  expect(controls.length).toBeGreaterThan(0);
  for (const control of controls) {
    expect(control.matches(':disabled'), control.getAttribute('name') ?? control.outerHTML).toBe(disabled);
  }
}

beforeEach(() => {
  navigated().length = 0;
  vi.mocked(notifications.show).mockClear();
  window.localStorage.clear();
  window.sessionStorage.clear();
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = 'demo-cloud';
  process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY = 'demo-key';
  testGlobal().researchUploadForms = [];
  testGlobal().researchSearchParams = {};
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
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function formInputs(): Array<Record<string, FormDataEntryValue>> {
  return testGlobal().researchUploadForms ?? [];
}

it('두 편집 화면의 다른 필드 변경을 각각 복구할 수 있게 보관한다', async () => {
  seedResearchWorkspace();
  testGlobal().researchSearchParams = { researchJobId: 'job-1' };
  const mountWorkspace = () => {
    const scenario = newScenario();
    scenario.jobResponses = [completedJob];
    return render(
      <ApolloProvider client={makeClient(scenario)}>
        <ProductResearchSection />
      </ApolloProvider>
    );
  };
  const a = mountWorkspace();
  const b = mountWorkspace();
  await waitFor(() => expect(a.container.querySelector('[name="review-name"]')).not.toBeNull());
  await waitFor(() => expect(b.container.querySelector('[name="review-summary"]')).not.toBeNull());
  fireEvent.change(a.container.querySelector('[name="review-name"]')!, {
    target: { value: 'A에서 고친 이름' },
  });
  fireEvent.change(b.container.querySelector('[name="review-summary"]')!, {
    target: { value: 'B에서 고친 요약' },
  });
  const reviews = Object.values(localStorage).flatMap(raw => {
    try {
      const parsed = JSON.parse(raw);
      return [parsed.workspace?.review ?? parsed.review].filter(Boolean);
    } catch {
      return [];
    }
  });
  expect(reviews).toContainEqual(expect.objectContaining({ name: 'A에서 고친 이름', summary: '사람 요약' }));
  expect(reviews).toContainEqual(expect.objectContaining({ name: '사람 이름', summary: 'B에서 고친 요약' }));
});

it('다른 탭의 같은 필드 변경을 덮어쓰지 않고 선택한 편집본의 사본으로 복원한다', async () => {
  seedResearchWorkspace();
  testGlobal().researchSearchParams = { researchJobId: 'job-1' };
  const mount = () => {
    const scenario = newScenario();
    scenario.jobResponses = [completedJob];
    const client = makeClient(scenario);
    return {
      ...render(
        <ApolloProvider client={client}>
          <ProductResearchSection />
        </ApolloProvider>
      ),
      client,
    };
  };
  const a = mount();
  const b = mount();
  await waitFor(() => expect(a.container.querySelector('[name="review-name"]')).not.toBeNull());
  await waitFor(() => expect(b.container.querySelector('[name="review-name"]')).not.toBeNull());
  fireEvent.change(a.container.querySelector('[name="review-name"]')!, {
    target: { value: 'A 편집' },
  });
  fireEvent.change(b.container.querySelector('[name="review-name"]')!, {
    target: { value: 'B 편집' },
  });
  fireEvent(
    window,
    new StorageEvent('storage', {
      key: 'other-tab',
      storageArea: localStorage,
    })
  );
  expect((a.container.querySelector('[name="review-name"]') as HTMLInputElement).value).toBe('A 편집');
  fireEvent.click(within(a.container).getByText(/저장된 다른 편집본/));
  fireEvent.click(within(a.container).getByRole('button', { name: 'B 편집 편집본 복원' }));
  await waitFor(() =>
    expect((a.container.querySelector('[name="review-name"]') as HTMLInputElement).value).toBe('B 편집')
  );
  fireEvent.change(a.container.querySelector('[name="review-summary"]')!, {
    target: { value: '복원 후 수정' },
  });
  const drafts = listWorkspaceDrafts(localStorage, 'job-1');
  expect(drafts).toHaveLength(3);
  expect(drafts.map(draft => draft.workspace.review)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: 'A 편집', summary: '사람 요약' }),
      expect.objectContaining({ name: 'B 편집', summary: '사람 요약' }),
      expect.objectContaining({ name: 'B 편집', summary: '복원 후 수정' }),
    ])
  );
  expect((b.container.querySelector('[name="review-summary"]') as HTMLTextAreaElement).value).toBe('사람 요약');
  // 선택 복원 뒤 고친 값을 job 이동 후에도 오래된 선택 snapshot으로 되돌리지 않는다.
  testGlobal().researchSearchParams = { researchJobId: 'job-2' };
  a.rerender(
    <ApolloProvider client={a.client}>
      <ProductResearchSection />
    </ApolloProvider>
  );
  await waitFor(() => expect(readWorkspaceDraft(localStorage, sessionStorage)?.jobId).toBe('job-2'));
  testGlobal().researchSearchParams = { researchJobId: 'job-1' };
  a.rerender(
    <ApolloProvider client={a.client}>
      <ProductResearchSection />
    </ApolloProvider>
  );
  await waitFor(() =>
    expect((a.container.querySelector('[name="review-summary"]') as HTMLTextAreaElement)?.value).toBe('복원 후 수정')
  );
});

it('초안 저장 실패를 알리고 입력을 유지한 채 같은 화면에서 다시 저장한다', async () => {
  seedResearchWorkspace();
  testGlobal().researchSearchParams = { researchJobId: 'job-1' };
  const setItem = Storage.prototype.setItem;
  const storageFailure = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
    this: Storage,
    key,
    value
  ) {
    if (key.includes('product-research-drafts:v2:')) throw new DOMException('quota', 'QuotaExceededError');
    setItem.call(this, key, value);
  });
  const scenario = newScenario();
  scenario.jobResponses = [completedJob];
  render(
    <ApolloProvider client={makeClient(scenario)}>
      <ProductResearchSection />
    </ApolloProvider>
  );
  await screen.findByRole('alert');
  fireEvent.change(await screen.findByRole('textbox', { name: '서비스 이름' }), { target: { value: '저장할 입력' } });
  storageFailure.mockRestore();
  fireEvent.click(screen.getByRole('button', { name: '초안 저장 다시 시도' }));
  await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  expect(readWorkspaceDraft(localStorage, sessionStorage, 'job-1')?.review.name).toBe('저장할 입력');
});

describe('admin research workspace flow', () => {
  it('로고 업로드부터 등록 응답까지 모든 검토 입력을 잠그고 실패 뒤 같은 업로드와 초안으로 재시도한다', async () => {
    const upload = Promise.withResolvers<Response>();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => upload.promise)
    );
    const { review, materializations, form } = await renderSubmissionReview();
    fireEvent.change(document.querySelector('[name="review-logo-file"]')!, {
      target: {
        files: [new File(['review-logo'], 'review-logo.png', { type: 'image/png' })],
      },
    });
    fireEvent.submit(form);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expectReviewDisabled(form, true);
    expect(materializations).toHaveLength(0);
    expect(navigated()).toEqual([]);
    // disabled 버튼을 거치지 않는 중복 submit도 두 번째 업로드를 시작하지 않는다.
    fireEvent.submit(form);
    const uploadedUrl = 'https://res.cloudinary.com/demo/image/upload/v1/reviewed.png';
    await act(async () => upload.resolve(new Response(JSON.stringify({ secure_url: uploadedUrl }))));
    await waitFor(() => expect(materializations).toHaveLength(1));
    expectReviewDisabled(form, true);
    expect(materializations[0].variables.input).toMatchObject({
      ...review,
      researchJobId: 'job-1',
      logoUrl: uploadedUrl,
      officialUrlConfirmed: true,
    });
    materializations[0].fail(new GraphQLError('합성 등록 실패'));
    await screen.findByRole('alert');
    expectReviewDisabled(form, false);
    expect(navigated()).toEqual([]);
    expect(JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!).review).toEqual({
      ...review,
      logoUrl: uploadedUrl,
    });
    fireEvent.change(screen.getByRole('textbox', { name: '서비스 이름' }), {
      target: { value: '재검토한 이름' },
    });
    fireEvent.submit(form);
    await waitFor(() => expect(materializations).toHaveLength(2));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(materializations[1].variables.input).toMatchObject({
      ...review,
      name: '재검토한 이름',
      logoUrl: uploadedUrl,
      officialUrlConfirmed: true,
    });
    materializations[1].respond({
      id: 'reviewed-product',
      slug: 'human-slug',
      name: '재검토한 이름',
    });
    await waitFor(() => expect(navigated()).toEqual(['/products/human-slug']));
  });

  it('로고 업로드 실패 뒤 모든 검토 입력과 제출을 복구하고 수정한 초안으로 재시도한다', async () => {
    const upload = Promise.withResolvers<Response>();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => upload.promise)
    );
    const { review, materializations, form } = await renderSubmissionReview();
    fireEvent.change(document.querySelector('[name="review-logo-file"]')!, {
      target: {
        files: [new File(['logo'], 'logo.png', { type: 'image/png' })],
      },
    });
    fireEvent.submit(form);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expectReviewDisabled(form, true);
    await act(async () => upload.reject(new Error('합성 업로드 실패')));
    await waitFor(() => expectReviewDisabled(form, false));
    expect(materializations).toHaveLength(0);
    expect(navigated()).toEqual([]);
    expect(JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!).review).toEqual(review);
    fireEvent.change(screen.getByRole('textbox', { name: '요약' }), {
      target: { value: '재검토한 요약' },
    });
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ secure_url: 'https://fixture.invalid/logo.png' }))
    );
    fireEvent.submit(form);
    await waitFor(() => expect(materializations).toHaveLength(1));
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(materializations[0].variables.input).toMatchObject({
      summary: '재검토한 요약',
    });
  });

  it('URL 로고로 등록할 때도 첫 await 전부터 잠그고 같은 render의 연속 제출을 한 번만 보낸다', async () => {
    const { form, materializations } = await renderSubmissionReview();
    act(() => {
      fireEvent.submit(form);
      fireEvent.submit(form);
    });
    await waitFor(() => expect(materializations).toHaveLength(1));
    expectReviewDisabled(form, true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([256, 300])('기존 %i자 기능 설명을 보존하고 필드 오류를 고친 뒤에만 등록한다', async length => {
    testGlobal().researchSearchParams = { researchJobId: 'job-1' };
    const summary = '가'.repeat(length);
    const scenario = newScenario();
    scenario.jobResponses = [
      {
        ...completedJob,
        result: {
          ...completedJob.result,
          features: [{ ...completedJob.result.features[0], summary }],
        },
      },
    ];
    const mount = () =>
      render(
        <ApolloProvider client={makeClient(scenario)}>
          <ProductResearchSection />
        </ApolloProvider>
      );
    mount();
    await screen.findByDisplayValue(summary);
    const field = screen.getByRole('textbox', {
      name: '기능 1 설명',
    }) as HTMLTextAreaElement;
    expect(field.value).toBe(summary);
    expect(field.getAttribute('aria-invalid')).toBe('true');
    const errorId = field
      .getAttribute('aria-describedby')
      ?.split(' ')
      .find(id => id.endsWith('-error'));
    expect(document.getElementById(errorId ?? '')?.textContent).toContain(`${length - 255}자 초과`);
    expect(document.getElementById(errorId ?? '')?.textContent).toContain(`${length}자`);
    fireEvent.change(document.querySelector('input[name="review-logo-file"]')!, {
      target: {
        files: [new File(['logo'], 'logo.png', { type: 'image/png' })],
      },
    });
    fireEvent.submit(field.closest('form')!);
    expect(scenario.signInputs).toHaveLength(0);
    expect(scenario.materializeVars).toHaveLength(0);
    await waitFor(() =>
      expect(JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!).review.features[0].summary).toBe(summary)
    );
    cleanup();
    mount();
    await screen.findByDisplayValue(summary);
    const restored = screen.getByRole('textbox', {
      name: '기능 1 설명',
    }) as HTMLTextAreaElement;
    expect(restored.value).toBe(summary);
    expect(restored.getAttribute('aria-invalid')).toBe('true');
    fireEvent.change(restored, { target: { value: '가'.repeat(255) } });
    expect(restored.getAttribute('aria-invalid')).not.toBe('true');
    fireEvent.change(document.querySelector('input[name="review-logo-url"]')!, {
      target: { value: 'https://linear.app/logo.png' },
    });
    fireEvent.click(screen.getByRole('button', { name: '검토 내용으로 미발행 생성' }));
    await waitFor(() => expect(scenario.materializeVars).toHaveLength(1));
    expect(scenario.materializeVars[0]).toMatchObject({
      input: { features: [{ summary: '가'.repeat(255) }] },
    });
  });

  it('태그 순차 입력은 쉼표와 공백을 보존하고 blur 전 제출에서 두 태그를 전달한다', async () => {
    testGlobal().researchSearchParams = { researchJobId: 'job-1' };
    const scenario = newScenario();
    scenario.jobResponses = [completedJob];
    render(
      <ApolloProvider client={makeClient(scenario)}>
        <ProductResearchSection />
      </ApolloProvider>
    );
    const tags = (await screen.findByDisplayValue('협업')) as HTMLInputElement;
    tags.focus();
    for (const character of ', ') {
      fireEvent.change(tags, { target: { value: tags.value + character } });
    }
    expect(tags.value).toBe('협업, ');
    for (const character of '생산성') {
      fireEvent.change(tags, { target: { value: tags.value + character } });
    }
    expect(tags.value).toBe('협업, 생산성');
    fireEvent.change(document.querySelector('[name="review-logo-url"]')!, {
      target: { value: 'https://linear.app/logo.png' },
    });
    expect(document.activeElement).toBe(tags);
    fireEvent.submit(tags.closest('form')!);
    await waitFor(() => expect(scenario.materializeVars).toHaveLength(1));
    expect(scenario.materializeVars[0]).toMatchObject({ input: { tags: ['협업', '생산성'] } });
  });

  it('태그 원문은 같은 job 조회와 등록 실패 뒤 유지하고 job 전환·재방문은 정규화 배열을 복원한다', async () => {
    const race = await renderCompletedResearch();
    const tags = document.querySelector<HTMLInputElement>('[name="review-tags"]')!;
    for (const character of '협업, 생산성, ') {
      fireEvent.change(tags, { target: { value: tags.value + character } });
    }
    expect(tags.value).toBe('협업, 생산성, ');
    fireEvent.click(screen.getByRole('button', { name: '결과 새로고침' }));
    await waitFor(() => expect(race.lookups).toHaveLength(2));
    await screen.findByRole('button', { name: '결과 새로고침' });
    expect(tags.value).toBe('협업, 생산성, ');
    fireEvent.submit(tags.closest('form')!);
    await waitFor(() => expect(race.materializations).toHaveLength(1));
    expect(race.materializations[0].variables.input.tags).toEqual(['협업', '생산성']);
    race.materializations[0].fail(new Error('태그 등록 합성 실패'));
    await screen.findByRole('alert');
    expect(tags.value).toBe('협업, 생산성, ');
    expect(JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!).review.tags).toEqual(['협업', '생산성']);

    race.jobs['job-2'] = { ...completedJob, id: 'job-2', result: { ...completedJob.result, tags: ['자동화'] } };
    testGlobal().researchSearchParams = { researchJobId: 'job-2' };
    race.view.rerender(
      <ApolloProvider client={race.client}>
        <ProductResearchSection />
      </ApolloProvider>
    );
    await screen.findByDisplayValue('자동화');
    expect(document.querySelector<HTMLInputElement>('[name="review-tags"]')!.value).toBe('자동화');
    testGlobal().researchSearchParams = { researchJobId: 'job-1' };
    race.view.rerender(
      <ApolloProvider client={race.client}>
        <ProductResearchSection />
      </ApolloProvider>
    );
    await screen.findByDisplayValue('협업, 생산성');
    expect(document.querySelector<HTMLInputElement>('[name="review-tags"]')!.value).toBe('협업, 생산성');
    fireEvent.change(document.querySelector('[name="review-tags"]')!, { target: { value: '협업, 생산성, ' } });
    race.jobs['job-new'] = {
      ...completedJob,
      id: 'job-new',
      officialUrl: 'https://notion.so/',
      result: { ...completedJob.result, tags: ['새 조사'] },
    };
    submitResearchRequest('https://notion.so/');
    await waitFor(() => expect(race.requests).toHaveLength(1));
    race.requests[0].respond();
    await screen.findByDisplayValue('새 조사');
    expect(document.querySelector<HTMLInputElement>('[name="review-tags"]')!.value).toBe('새 조사');
  });

  it.each([
    { raw: '  협업  , 생산성, 협업,  TEAM   Work , team work, , ', expected: ['협업', '생산성', 'TEAM Work'] },
    { raw: '', expected: [] },
  ])('붙여넣기·빈 태그 입력 $raw 은 원문을 유지하고 기존 의미로 제출한다', async ({ raw, expected }) => {
    const { materializations } = await renderCompletedResearch();
    const tags = document.querySelector<HTMLInputElement>('[name="review-tags"]')!;
    fireEvent.change(tags, { target: { value: raw } });
    expect(tags.value).toBe(raw);
    fireEvent.submit(tags.closest('form')!);
    await waitFor(() => expect(materializations).toHaveLength(1));
    expect(materializations[0].variables.input.tags).toEqual(expected);
  });

  it('같은 job의 polling 완료 응답은 편집 중 태그 구분자를 덮어쓰지 않는다', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    testGlobal().researchSearchParams = { researchJobId: 'job-1' };
    const scenario = newScenario();
    scenario.jobResponses = [{ ...completedJob, status: 'in_progress' }, completedJob];
    render(
      <ApolloProvider client={makeClient(scenario)}>
        <ProductResearchSection />
      </ApolloProvider>
    );
    const tags = (await screen.findByDisplayValue('협업')) as HTMLInputElement;
    for (const character of ', 생산성, ') {
      fireEvent.change(tags, { target: { value: tags.value + character } });
    }
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    await screen.findByText(/작업 ID: job-1 · 상태: completed/);
    expect(scenario.jobQueries).toEqual(['job-1', 'job-1']);
    expect(tags.value).toBe('협업, 생산성, ');
  });

  it.each(['URL', 'localStorage'])(
    '%s 재진입의 성공한 null은 안내하고 여러 polling 주기 동안 조회하지 않는다',
    async entry => {
      vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
      const stored = {
        version: 1,
        requestId: 'stored-request',
        officialUrl: 'https://linear.app/',
        jobId: 'job-1',
        review: {
          name: '사람 이름',
          slug: 'human-slug',
          summary: '사람 요약',
          logoUrl: '',
          officialUrl: 'https://linear.app/',
          categoryIds: [],
          features: [],
          tags: [],
        },
        logoFileName: null,
        uploadedLogoUrl: null,
        materializedSlug: null,
      };
      window.localStorage.setItem(RESEARCH_WORKSPACE_STORAGE_KEY, JSON.stringify(stored));
      if (entry === 'URL') testGlobal().researchSearchParams = { researchJobId: 'job-1' };
      const scenario = newScenario();
      const initial = Promise.withResolvers<unknown>();
      scenario.jobResponses = [initial.promise, completedJob];
      render(
        <ApolloProvider client={makeClient(scenario)}>
          <ProductResearchSection />
        </ApolloProvider>
      );
      await screen.findByRole('button', { name: '새로고침 중...' });
      expect(screen.queryByText(/조사 작업을 찾을 수 없습니다/)).toBeNull();
      await act(async () => initial.resolve(null));
      await screen.findByText(/조사 작업을 찾을 수 없습니다/);
      expect((screen.getByRole('button', { name: '결과 새로고침' }) as HTMLButtonElement).disabled).toBe(false);
      expect((screen.getByRole('button', { name: '조사 요청' }) as HTMLButtonElement).disabled).toBe(false);
      expect(screen.queryByRole('button', { name: '실패 작업 재조사' })).toBeNull();
      expect(screen.getByDisplayValue('https://linear.app/')).toBeTruthy();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(12000);
      });
      expect(scenario.jobQueries).toEqual(['job-1']);
      expect(scenario.requestInputs).toEqual([]);
      expect(JSON.parse(readSavedWorkspace(`${RESEARCH_WORKSPACE_STORAGE_KEY}:job-1`)!).review).toEqual(stored.review);
      fireEvent.click(screen.getByRole('button', { name: '결과 새로고침' }));
      expect(await screen.findByDisplayValue('사람 이름')).toBeTruthy();
      expect(screen.getByDisplayValue('사람 요약')).toBeTruthy();
      expect(screen.queryByText(/조사 작업을 찾을 수 없습니다/)).toBeNull();
    }
  );

  it.each(['interval', 'visibility'])('pending 뒤 %s 조회 null은 polling을 중단하고 입력을 보존한다', async source => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    testGlobal().researchSearchParams = { researchJobId: 'job-1' };
    const scenario = newScenario();
    scenario.jobResponses = [pendingJob, null];
    render(
      <ApolloProvider client={makeClient(scenario)}>
        <ProductResearchSection />
      </ApolloProvider>
    );
    await screen.findByRole('button', { name: '자동 확인 중...' });
    fireEvent.change(document.querySelector('[name="officialUrl"]')!, { target: { value: 'https://human.example/' } });
    if (source === 'interval') {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000);
      });
    } else {
      const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
      fireEvent(document, new Event('visibilitychange'));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(6000);
      });
      expect(scenario.jobQueries).toHaveLength(1);
      visibility.mockReturnValue('visible');
      fireEvent(document, new Event('visibilitychange'));
    }
    await screen.findByText(/조사 작업을 찾을 수 없습니다/);
    expect((screen.getByRole('button', { name: '결과 새로고침' }) as HTMLButtonElement).disabled).toBe(false);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(12000);
    });
    expect(scenario.jobQueries).toEqual(['job-1', 'job-1']);
    expect(screen.getByDisplayValue('https://human.example/')).toBeTruthy();
    expect(JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!).officialUrl).toBe('https://human.example/');
  });

  it.each(['pending', 'in_progress'])(
    '부재 수동 조회 중에만 새로고침을 막고 정상 %s 복구 뒤 polling과 completed 종료를 유지한다',
    async status => {
      vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
      testGlobal().researchSearchParams = { researchJobId: 'job-1' };
      const scenario = newScenario();
      const refresh = Promise.withResolvers<unknown>();
      scenario.jobResponses = [null, refresh.promise, completedJob];
      render(
        <ApolloProvider client={makeClient(scenario)}>
          <ProductResearchSection />
        </ApolloProvider>
      );
      await screen.findByText(/조사 작업을 찾을 수 없습니다/);
      fireEvent.click(screen.getByRole('button', { name: '결과 새로고침' }));
      expect(((await screen.findByRole('button', { name: '새로고침 중...' })) as HTMLButtonElement).disabled).toBe(
        true
      );
      await act(async () => refresh.resolve({ ...pendingJob, status }));
      await screen.findByRole('button', { name: '자동 확인 중...' });
      expect(screen.queryByText(/조사 작업을 찾을 수 없습니다/)).toBeNull();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000);
      });
      await screen.findByDisplayValue('Linear');
      await screen.findByRole('button', { name: '결과 새로고침' });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(12000);
      });
      expect(scenario.jobQueries).toHaveLength(3);
    }
  );

  it.each([new Error('network unavailable'), new GraphQLError('query denied')])(
    '조회 오류 $message는 부재로 표시하지 않고 편집을 보존한다',
    async failure => {
      vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
      testGlobal().researchSearchParams = { researchJobId: 'job-1' };
      const scenario = newScenario();
      scenario.jobResponses = [completedJob, failure];
      render(
        <ApolloProvider client={makeClient(scenario)}>
          <ProductResearchSection />
        </ApolloProvider>
      );
      fireEvent.change(await screen.findByDisplayValue('Linear'), { target: { value: '사람 편집 유지' } });
      fireEvent.click(screen.getByRole('button', { name: '결과 새로고침' }));
      await screen.findByText(failure.message);
      expect(screen.queryByText(/조사 작업을 찾을 수 없습니다/)).toBeNull();
      expect(screen.getByDisplayValue('사람 편집 유지')).toBeTruthy();
      expect(JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!).review.name).toBe('사람 편집 유지');
      expect((screen.getByRole('button', { name: '결과 새로고침' }) as HTMLButtonElement).disabled).toBe(false);
    }
  );

  it.each([null, new Error('stale network failure'), new GraphQLError('stale GraphQL failure')])(
    '다른 job의 후착 응답 %s는 현재 Review·오류·polling을 바꾸지 않는다',
    async staleResponse => {
      vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
      testGlobal().researchSearchParams = { researchJobId: 'job-old' };
      const stale = Promise.withResolvers<unknown>();
      const scenario = newScenario();
      scenario.jobResponses = [
        stale.promise,
        { ...pendingJob, id: 'job-current' },
        { ...completedJob, id: 'job-current' },
      ];
      const client = makeClient(scenario);
      const view = render(
        <ApolloProvider client={client}>
          <ProductResearchSection />
        </ApolloProvider>
      );
      await waitFor(() => expect(scenario.jobQueries).toEqual(['job-old']));
      testGlobal().researchSearchParams = { researchJobId: 'job-current' };
      view.rerender(
        <ApolloProvider client={client}>
          <ProductResearchSection />
        </ApolloProvider>
      );
      await screen.findByRole('button', { name: '자동 확인 중...' });
      await act(async () => stale.resolve(staleResponse));
      expect(screen.queryByText(/조사 작업을 찾을 수 없습니다/)).toBeNull();
      expect(screen.queryByText(/stale .* failure/)).toBeNull();
      expect(screen.getByRole('button', { name: '자동 확인 중...' })).toBeTruthy();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000);
      });
      expect(await screen.findByDisplayValue('Linear')).toBeTruthy();
      expect(screen.queryByText(/작업 ID: job-current/)).toBeTruthy();
      expect(scenario.jobQueries).toEqual(['job-old', 'job-current', 'job-current']);
    }
  );

  it.each([new Error('initial network failure'), new GraphQLError('initial GraphQL failure')])(
    '최초 조회 실패 $message는 null이 아니며 자동 요청 없이 수동 복구를 제공한다',
    async failure => {
      vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
      testGlobal().researchSearchParams = { researchJobId: 'job-1' };
      const scenario = newScenario();
      scenario.jobResponses = [failure];
      render(
        <ApolloProvider client={makeClient(scenario)}>
          <ProductResearchSection />
        </ApolloProvider>
      );
      await screen.findByText(failure.message);
      expect(screen.queryByText(/조사 작업을 찾을 수 없습니다/)).toBeNull();
      expect((screen.getByRole('button', { name: '결과 새로고침' }) as HTMLButtonElement).disabled).toBe(false);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(12000);
      });
      expect(scenario.jobQueries).toHaveLength(1);
      expect(scenario.requestInputs).toEqual([]);
    }
  );

  it.each(['request', 'retry'])(
    '%s 뒤 null도 polling을 시작하지 않고 failed retry는 새 logical job으로 이동한다',
    async action => {
      vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
      const scenario = newScenario();
      scenario.requestJobs = [{ id: 'job-new', officialUrl: 'https://linear.app/' }];
      if (action === 'retry') {
        testGlobal().researchSearchParams = { researchJobId: 'job-1' };
        scenario.jobResponses = [
          { ...pendingJob, status: 'failed', errorCode: 'SEARCH_FAILED', errorMessage: '합성 조사 실패' },
          null,
        ];
      } else {
        scenario.jobResponses = [null];
      }
      render(
        <ApolloProvider client={makeClient(scenario)}>
          <ProductResearchSection />
        </ApolloProvider>
      );
      if (action === 'retry') {
        fireEvent.click(await screen.findByRole('button', { name: '실패 작업 재조사' }));
      } else {
        requestWorkspace();
      }
      await screen.findByText(/조사 작업을 찾을 수 없습니다/);
      expect(navigated().at(-1)).toBe('/products/new?researchJobId=job-new');
      await act(async () => {
        await vi.advanceTimersByTimeAsync(12000);
      });
      expect(scenario.jobQueries).toEqual(action === 'retry' ? ['job-1', 'job-new'] : ['job-new']);
      expect(scenario.retryInputs).toHaveLength(action === 'retry' ? 1 : 0);
      expect(scenario.requestInputs).toHaveLength(action === 'request' ? 1 : 0);
      expect((screen.getByRole('button', { name: '결과 새로고침' }) as HTMLButtonElement).disabled).toBe(false);
    }
  );

  it('진행 중 작업에서 새 조사로 전환한 뒤 조회 실패해도 이전 timer를 물려받지 않고 수동 복구할 수 있다', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    testGlobal().researchSearchParams = { researchJobId: 'job-1' };
    const scenario = newScenario();
    scenario.requestJobs = [{ id: 'job-new', officialUrl: 'https://linear.app/' }];
    scenario.jobResponses = [pendingJob, new Error('new job query failed'), { ...completedJob, id: 'job-new' }];
    render(
      <ApolloProvider client={makeClient(scenario)}>
        <ProductResearchSection />
      </ApolloProvider>
    );
    await screen.findByRole('button', { name: '자동 확인 중...' });
    requestWorkspace();
    await screen.findByText('new job query failed');
    expect(screen.queryByText(/조사 작업을 찾을 수 없습니다/)).toBeNull();
    const refresh = screen.getByRole('button', { name: '결과 새로고침' }) as HTMLButtonElement;
    expect(refresh.disabled).toBe(false);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(12000);
    });
    expect(scenario.jobQueries).toEqual(['job-1', 'job-new']);
    fireEvent.click(refresh);
    expect(await screen.findByDisplayValue('Linear')).toBeTruthy();
    expect(screen.queryByText('new job query failed')).toBeNull();
    expect(screen.queryByText(/작업 ID: job-new/)).toBeTruthy();
  });

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

    const stored = JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY) ?? '{}');
    expect(stored.jobId).toBe('job-1');
    expect(stored.officialUrl).toBe('https://linear.app/');

    // Review 편집 후 새로고침 시뮬레이션: 동일 localStorage로 다시 마운트하면 복구된다.
    fireEvent.change(await screen.findByDisplayValue('Linear'), { target: { value: 'Linear 편집' } });
    await waitFor(() =>
      expect(JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY) ?? '{}').review.name).toBe('Linear 편집')
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

  it('다른 researchJobId로 재진입하면 이전 작업의 편집을 섞지 않고 재방문 시 복구한다', async () => {
    // 저장된 워크스페이스: job-1 완료 + 사용자가 편집한 이름.
    window.localStorage.setItem(
      RESEARCH_WORKSPACE_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        requestId: 'e7f8a1b2c3d4412a9b0c1d2e3f4a5b6c',
        officialUrl: 'https://linear.app/',
        jobId: 'job-1',
        review: {
          name: 'Linear 편집',
          slug: 'linear',
          summary: '조사 요약',
          logoUrl: '',
          officialUrl: 'https://linear.app/',
          categoryIds: [],
          features: [{ name: '이슈 추적', summary: '빠른 이슈 관리', emoji: '✨' }],
          tags: ['협업'],
        },
        logoFileName: null,
        uploadedLogoUrl: null,
        materializedSlug: null,
      })
    );
    testGlobal().researchSearchParams = { researchJobId: 'job-2' };

    const scenario = newScenario();
    const otherJob = { ...pendingJob, id: 'job-2' };
    scenario.jobResponses = [otherJob, { ...completedJob, id: 'job-2' }];
    render(
      <ApolloProvider client={makeClient(scenario)}>
        <ProductResearchSection />
      </ApolloProvider>
    );

    // URL이 지시한 job-2가 로드되어 표시된다.
    await waitFor(() => expect(screen.queryByText(/작업 ID: job-2/)?.textContent).toContain('job-2'), {
      timeout: 8000,
    });
    expect(screen.queryByDisplayValue('Linear 편집')).toBeNull();

    // 폴링이 결과를 가져와 제안이 표시된다.
    await waitFor(() => expect(screen.queryByText(/제안 slug/)?.textContent).toContain('linear'), { timeout: 8000 });

    const stored = JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY) ?? '{}');
    expect(stored.jobId).toBe('job-2');
    expect(JSON.parse(readSavedWorkspace(`${RESEARCH_WORKSPACE_STORAGE_KEY}:job-1`)!).review.name).toBe('Linear 편집');
    cleanup();
    testGlobal().researchSearchParams = { researchJobId: 'job-1' };
    const revisit = newScenario();
    revisit.jobResponses = [completedJob];
    render(
      <ApolloProvider client={makeClient(revisit)}>
        <ProductResearchSection />
      </ApolloProvider>
    );
    await waitFor(() => expect(screen.queryByDisplayValue('Linear 편집')).toBeTruthy());
  });

  it('저장된 워크스페이스가 없어도 researchJobId 쿼리로 작업을 재개한다', async () => {
    testGlobal().researchSearchParams = { researchJobId: 'job-9' };

    const scenario = newScenario();
    scenario.jobResponses = [
      { ...pendingJob, id: 'job-9' },
      { ...completedJob, id: 'job-9' },
    ];
    render(
      <ApolloProvider client={makeClient(scenario)}>
        <ProductResearchSection />
      </ApolloProvider>
    );

    await waitFor(() => expect(screen.queryByText(/작업 ID: job-9/)?.textContent).toContain('job-9'), {
      timeout: 8000,
    });
    await waitFor(() => expect(screen.queryByText(/제안 slug/)?.textContent).toContain('linear'), { timeout: 8000 });
    const stored = JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY) ?? '{}');
    expect(stored.jobId).toBe('job-9');
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

    fireEvent.change(await screen.findByDisplayValue('Linear'), { target: { value: 'Linear 편집' } });

    const file = new File(['logo'], 'logo.png', { type: 'image/png' });
    fireEvent.change(document.querySelector('input[name="review-logo-file"]') as HTMLInputElement, {
      target: { files: [file] },
    });

    fireEvent.click(screen.getByRole('button', { name: '검토 내용으로 미발행 생성' }));

    await waitFor(() => expect(navigated()).toEqual(['/products/new?researchJobId=job-1', '/products/linear']), {
      timeout: 8000,
    });

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

  it('공식 URL 변경 확인은 해당 URL에만 유효하고 mutation에 명시적으로 전달된다', async () => {
    const scenario = newScenario();
    scenario.jobResponses = [completedJob];
    render(
      <ApolloProvider client={makeClient(scenario)}>
        <ProductResearchSection />
      </ApolloProvider>
    );
    requestWorkspace();
    await waitFor(() => expect(screen.queryByText(/제안 slug/)?.textContent).toContain('linear'));
    const url = document.querySelector('input[name="review-official-url"]') as HTMLInputElement;
    fireEvent.change(url, { target: { value: 'https://linear.app/different' } });
    const confirmation = screen.getByRole('checkbox', {
      name: '변경한 URL이 공식 사이트인지 직접 확인했습니다.',
    }) as HTMLInputElement;
    expect(confirmation.checked).toBe(false);
    fireEvent.click(confirmation);
    expect(confirmation.checked).toBe(true);
    fireEvent.change(url, { target: { value: 'https://linear.app/another' } });
    expect(confirmation.checked).toBe(false);
    fireEvent.click(confirmation);
    fireEvent.change(document.querySelector('input[name="review-logo-url"]') as HTMLInputElement, {
      target: { value: 'https://linear.app/logo.png' },
    });
    fireEvent.click(screen.getByRole('button', { name: '검토 내용으로 미발행 생성' }));
    await waitFor(() => expect(scenario.materializeVars).toHaveLength(1));
    expect(scenario.materializeVars[0]).toMatchObject({
      input: { officialUrl: 'https://linear.app/another', officialUrlConfirmed: true },
    });
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

    fireEvent.change(await screen.findByDisplayValue('Linear'), { target: { value: 'Linear 편집' } });
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

  it('같은 URL의 새 action은 새 UUID를 보내 새 작업을 요청한다', async () => {
    const scenario = newScenario();
    scenario.jobResponses = [completedJob, { ...completedJob, id: 'job-2' }];
    scenario.requestJobs.push({ id: 'job-2', officialUrl: 'https://linear.app/' });
    render(
      <ApolloProvider client={makeClient(scenario)}>
        <ProductResearchSection />
      </ApolloProvider>
    );
    requestWorkspace();
    await waitFor(() => expect(screen.queryByDisplayValue('Linear')).toBeTruthy());
    requestWorkspace();
    await waitFor(() => expect(scenario.requestInputs).toHaveLength(2));
    expect(scenario.requestInputs[0]!.requestId).not.toBe(scenario.requestInputs[1]!.requestId);
    expect(scenario.requestInputs[1]!.requestId).toMatch(
      /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/
    );
    await waitFor(() => expect(navigated().at(-1)).toBe('/products/new?researchJobId=job-2'));
  });

  it('중복 form 전송은 같은 requestId를 유지한다', async () => {
    const scenario = newScenario();
    scenario.jobResponses = [completedJob];
    render(
      <ApolloProvider client={makeClient(scenario)}>
        <ProductResearchSection />
      </ApolloProvider>
    );
    fireEvent.change(document.querySelector('[name="officialUrl"]')!, { target: { value: 'https://linear.app/' } });
    const form = document.querySelector('[name="officialUrl"]')!.closest('form')!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    await waitFor(() => expect(scenario.requestInputs).toHaveLength(2));
    expect(scenario.requestInputs[0]!.requestId).toBe(scenario.requestInputs[1]!.requestId);
  });

  it('요청 후 URL이 현재 job으로 바뀌어도 복구 조회와 polling을 이어간다', async () => {
    const scenario = newScenario();
    scenario.jobResponses = [pendingJob, completedJob];
    const client = makeClient(scenario);
    const view = render(
      <ApolloProvider client={client}>
        <ProductResearchSection />
      </ApolloProvider>
    );
    requestWorkspace();
    await waitFor(() => expect(navigated().at(-1)).toBe('/products/new?researchJobId=job-1'));
    testGlobal().researchSearchParams = { researchJobId: 'job-1' };
    view.rerender(
      <ApolloProvider client={client}>
        <ProductResearchSection />
      </ApolloProvider>
    );
    await waitFor(() => expect(screen.queryByDisplayValue('Linear')).toBeTruthy(), { timeout: 1000 });
  });

  it('숨김 상태는 polling을 중단하고 가시 재방문은 즉시 조회 후 3초 polling을 재개한다', async () => {
    testGlobal().researchSearchParams = { researchJobId: 'job-1' };
    const scenario = newScenario();
    scenario.jobResponses = [pendingJob];
    render(
      <ApolloProvider client={makeClient(scenario)}>
        <ProductResearchSection />
      </ApolloProvider>
    );
    await screen.findByRole('button', { name: '자동 확인 중...' });
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    fireEvent(document, new Event('visibilitychange'));
    await screen.findByRole('button', { name: '결과 새로고침' });
    visibility.mockReturnValue('visible');
    fireEvent(document, new Event('visibilitychange'));
    await screen.findByRole('button', { name: '자동 확인 중...' });
    visibility.mockRestore();
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

    fireEvent.change(await screen.findByDisplayValue('Linear'), { target: { value: 'Linear 유지' } });
    const file = new File(['logo'], 'logo.png', { type: 'image/png' });
    fireEvent.change(document.querySelector('input[name="review-logo-file"]') as HTMLInputElement, {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole('button', { name: '검토 내용으로 미발행 생성' }));

    await waitFor(() => expect(scenario.signInputs).toHaveLength(1), { timeout: 8000 });
    expect(navigated()).toEqual(['/products/new?researchJobId=job-1']);
    // 실패해도 편집값은 그대로 남는다.
    expect((screen.getByDisplayValue('Linear 유지') as HTMLInputElement).value).toBe('Linear 유지');
    expect(scenario.materializeVars).toHaveLength(0);
  });

  it('로고 미리보기 변경 중에도 폴 타이머가 유지되고 완료 시에만 중단된다', async () => {
    const scenario = newScenario();
    scenario.jobResponses = [pendingJob, pendingJob, completedJob];
    const createdIntervals: unknown[] = [];
    const clearedIntervals: unknown[] = [];
    const createdIntervalDelays: number[] = [];
    const rawSetInterval = globalThis.setInterval.bind(globalThis);
    const rawClearInterval = globalThis.clearInterval.bind(globalThis);
    const setSpy = vi.spyOn(globalThis, 'setInterval').mockImplementation(((handler: () => void, ms?: number) => {
      const handle = rawSetInterval(handler, ms);
      createdIntervals.push(handle);
      createdIntervalDelays.push(ms ?? 0);
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
    // 가시 폴링은 3초 간격으로 실행된다.
    expect(createdIntervalDelays).toContain(3000);
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
            data: { requestProductResearch: next },
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
    expect(((await screen.findByDisplayValue('Linear')) as HTMLInputElement).value).toBe('Linear');
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
          requestResolvers.push(() => {
            observer.next({ data: { requestProductResearch: job } });
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
    expect(((await screen.findByDisplayValue('Linear')) as HTMLInputElement).value).toBe('Linear');
    expect(JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY) ?? '{}').jobId).toBe('job-second');
  });

  it('재조사 응답이 새 조사 요청보다 먼저 도착해도 최신 요청의 입력·저장 workspace·이동을 차지하지 않는다', async () => {
    const { requests, retries, lookups } = renderResearchRace();

    // 실패한 작업 A에서 재조사 B를 시작한다.
    await startFailedResearchRetry(retries);

    // B의 응답을 기다리는 동안 다른 URL의 새 조사 요청 C를 시작한다.
    submitResearchRequest('https://notion.so/');
    await waitFor(() => expect(requests).toHaveLength(1));

    // 후착한 이전 B 응답은 최신 C의 입력·workspace·route를 바꾸지 않는다.
    retries[0].respond();
    await act(async () => {
      await nextTurn();
    });
    expect(navigated()).toEqual([]);
    expect(lookups).toEqual(['job-1']);
    const urlInput = screen.getAllByPlaceholderText('ex) https://linear.app')[0] as HTMLInputElement;
    expect(urlInput.value).toBe('https://notion.so/');
    expect(screen.queryByText(/작업 ID: job-retry/)).toBeNull();
    expect(screen.queryByText(/작업 ID: job-1/)).toBeTruthy();
    const workspace = JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!);
    expect(workspace.requestId).toBe(requests[0].variables.requestId);
    expect(workspace.requestId).not.toBe(retries[0].variables.input?.requestId);
    expect(workspace.officialUrl).toBe('https://notion.so/');
    expect(workspace.jobId).toBe('job-1');
    expect(workspace.review.name).toBe('사람 이름');
    expect(workspace.review.logoUrl).toBe('https://linear.app/logo.png');
    expect(workspace.uploadedLogoUrl).toBe('https://res.cloudinary.com/demo/image/upload/v1/human-logo.png');
    const jobWorkspace = JSON.parse(readSavedWorkspace(`${RESEARCH_WORKSPACE_STORAGE_KEY}:job-1`)!);
    expect(jobWorkspace.review.name).toBe('사람 이름');

    // 최신 응답만 자기 새 작업으로 이동한다.
    requests[0].respond();
    await waitFor(() => expect(navigated()).toEqual(['/products/new?researchJobId=job-new']));
    await screen.findByText(/작업 ID: job-new/);
  });

  it('새 조사 요청 응답이 먼저 도착한 뒤 후착한 재조사 응답이 최신 화면을 되돌리지 않는다', async () => {
    const { requests, retries, lookups } = renderResearchRace();

    await startFailedResearchRetry(retries);
    submitResearchRequest('https://notion.so/');
    await waitFor(() => expect(requests).toHaveLength(1));

    // 최신 C 응답이 먼저 도착해 자기 새 작업으로 이동한다.
    requests[0].respond();
    await waitFor(() => expect(navigated()).toEqual(['/products/new?researchJobId=job-new']));
    await screen.findByText(/작업 ID: job-new/);
    const latestRequestId = requests[0].variables.requestId;

    // 후착한 이전 B 응답은 최신 URL·workspace·이동을 바꾸지 않는다.
    retries[0].respond();
    await act(async () => {
      await nextTurn();
    });
    expect(navigated()).toEqual(['/products/new?researchJobId=job-new']);
    const urlInput = screen.getAllByPlaceholderText('ex) https://linear.app')[0] as HTMLInputElement;
    expect(urlInput.value).toBe('https://notion.so/');
    expect(screen.queryByText(/작업 ID: job-retry/)).toBeNull();
    const workspace = JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!);
    expect(workspace.requestId).toBe(latestRequestId);
    expect(workspace.jobId).toBe('job-new');
    expect(lookups).not.toContain('job-retry');
  });

  it('재조사 후속 조회를 기다리는 동안 새 조사 요청이 시작되면 이전 retry의 polling·이동을 이어가지 않는다', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const retryLookup = Promise.withResolvers<unknown>();
    const { requests, retries, lookups } = renderResearchRace({
      jobs: { 'job-1': failedRaceJob, 'job-retry': retryLookup.promise, 'job-new': requestedRaceJob },
    });

    await startFailedResearchRetry(retries);

    // retry 응답이 도착하면 새 job으로 전환하고 후속 조회를 시작한다.
    retries[0].respond();
    await waitFor(() => expect(lookups).toEqual(['job-1', 'job-retry']));

    // 조회를 기다리는 동안 새 조사 요청 C를 시작한다.
    submitResearchRequest('https://notion.so/');
    await waitFor(() => expect(requests).toHaveLength(1));

    // 이전 retry의 후속 조회가 도착해도 polling·이동을 이어가지 않는다.
    retryLookup.resolve(retryRaceJob);
    await act(async () => {
      await nextTurn();
    });
    expect(navigated()).toEqual([]);
    expect(screen.queryByRole('button', { name: '자동 확인 중...' })).toBeNull();
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 4000));
    });
    expect(lookups).toEqual(['job-1', 'job-retry']);

    // 최신 응답만 자기 새 작업으로 이동한다.
    requests[0].respond();
    await waitFor(() => expect(navigated()).toEqual(['/products/new?researchJobId=job-new']));
  });

  it('역순 request→retry에서 최신 retry가 화면 전환을 소유하고 후착 요청 응답이 되돌리지 않는다', async () => {
    const { requests, retries } = renderResearchRace();

    // 실패 작업 A의 화면이 복원되면 새 조사 요청 C를 먼저 시작하고, 그 응답을 기다리는 동안 재조사 B를 시작한다.
    await screen.findByRole('button', { name: '실패 작업 재조사' });
    submitResearchRequest('https://notion.so/');
    await waitFor(() => expect(requests).toHaveLength(1));
    fireEvent.click(screen.getByRole('button', { name: '실패 작업 재조사' }));
    await waitFor(() => expect(retries).toHaveLength(1));

    // 최신 B 응답이 먼저 도착해 자기 새 작업으로 이동한다.
    retries[0].respond();
    await waitFor(() => expect(navigated()).toEqual(['/products/new?researchJobId=job-retry']));
    await screen.findByText(/작업 ID: job-retry/);

    // 후착한 이전 C 응답은 최신 화면을 되돌리지 않는다.
    requests[0].respond();
    await act(async () => {
      await nextTurn();
    });
    expect(navigated()).toEqual(['/products/new?researchJobId=job-retry']);
    expect(screen.queryByText(/작업 ID: job-new/)).toBeNull();
    const workspace = JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!);
    expect(workspace.jobId).toBe('job-retry');
    expect(workspace.requestId).toBe(retries[0].variables.input?.requestId);
  });

  it('재조사 응답을 기다리는 동안 같은 job route 재진입이 최신이면 이전 retry 응답이 초기화·이동하지 않는다', async () => {
    const { retries, lookups, client, view } = renderResearchRace({ searchParams: {} });

    await startFailedResearchRetry(retries);

    // 응답을 기다리는 동안 같은 job의 URL로 재진입한다.
    testGlobal().researchSearchParams = { researchJobId: 'job-1' };
    view.rerender(
      <ApolloProvider client={client}>
        <ProductResearchSection />
      </ApolloProvider>
    );
    await waitFor(() => expect(lookups).toEqual(['job-1', 'job-1']));

    // 재진입이 최신이면 이전 retry 응답은 편집 workspace를 초기화하거나 이동하지 않는다.
    retries[0].respond();
    await act(async () => {
      await nextTurn();
    });
    expect(navigated()).toEqual([]);
    expect(screen.queryByText(/작업 ID: job-retry/)).toBeNull();
    expect(screen.queryByText(/작업 ID: job-1/)).toBeTruthy();
    const workspace = JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!);
    expect(workspace.requestId).toBe('stored-request');
    expect(workspace.jobId).toBe('job-1');
    expect(workspace.review.name).toBe('사람 이름');
    expect(workspace.review.logoUrl).toBe('https://linear.app/logo.png');
    expect(workspace.uploadedLogoUrl).toBe('https://res.cloudinary.com/demo/image/upload/v1/human-logo.png');
    expect(lookups).not.toContain('job-retry');
  });

  it.each([{ kind: 'network' }, { kind: 'GraphQL' }])(
    '최신 재조사의 실제 $kind 실패는 표시하고 새 요청 성공이 이전 오류를 해제한다',
    async ({ kind }) => {
      const requestedCompletedJob = { ...completedJob, id: 'job-new', officialUrl: 'https://notion.so/' };
      const { requests, retries } = renderResearchRace({
        jobs: { 'job-1': failedRaceJob, 'job-retry': retryRaceJob, 'job-new': requestedCompletedJob },
      });

      // 실패한 작업 A의 재조사 B가 최신 세대에서 실패하면 현재 실패를 명확히 표시한다.
      await startFailedResearchRetry(retries);
      retries[0].fail(
        kind === 'GraphQL' ? new GraphQLError('현재 재조사 GraphQL 실패') : new Error('현재 재조사 network 실패')
      );
      const currentAlert = await screen.findByRole('alert');
      expect(currentAlert.textContent).toContain(
        kind === 'GraphQL' ? '현재 재조사 GraphQL 실패' : '현재 재조사 network 실패'
      );
      expect(screen.getByText(/작업 ID: job-1/)).toBeTruthy();
      expect((screen.getByRole('button', { name: '실패 작업 재조사' }) as HTMLButtonElement).disabled).toBe(false);

      // 같은 화면에서 새 요청 C를 보내면 B의 오류는 즉시 해제되고 C 성공 뒤에도 다시 나타나지 않는다.
      submitResearchRequest('https://notion.so/');
      await waitFor(() => expect(requests).toHaveLength(1));
      expect(screen.queryByRole('alert')).toBeNull();
      expect(requests[0].variables.requestId).not.toBe(retries[0].variables.input?.requestId);
      requests[0].respond();
      await waitFor(() => expect(navigated()).toEqual(['/products/new?researchJobId=job-new']));
      await screen.findByText(/작업 ID: job-new/);
      await screen.findByDisplayValue('Linear');
      expect(screen.queryByRole('alert')).toBeNull();
      expect(screen.queryByText(/현재 재조사 .* 실패/)).toBeNull();
      const workspace = JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!);
      expect(workspace.jobId).toBe('job-new');
      expect(workspace.officialUrl).toBe('https://notion.so/');
    }
  );

  it.each([{ kind: 'network' }, { kind: 'GraphQL' }])(
    '새 요청 성공 뒤 도착한 이전 재조사 $kind 실패는 최신 화면에 오류를 남기지 않는다',
    async ({ kind }) => {
      const requestedCompletedJob = { ...completedJob, id: 'job-new', officialUrl: 'https://notion.so/' };
      const { requests, retries } = renderResearchRace({
        jobs: { 'job-1': failedRaceJob, 'job-retry': retryRaceJob, 'job-new': requestedCompletedJob },
      });

      // 재조사 B를 시작하고 응답을 기다리는 동안 새 요청 C가 B를 대체한 뒤 성공한다.
      await startFailedResearchRetry(retries);
      submitResearchRequest('https://notion.so/');
      await waitFor(() => expect(requests).toHaveLength(1));
      requests[0].respond();
      await waitFor(() => expect(navigated()).toEqual(['/products/new?researchJobId=job-new']));
      await screen.findByText(/작업 ID: job-new/);

      // 후착한 B network/GraphQL 실패는 C 화면에 오류 DOM을 만들지 않는다.
      retries[0].fail(
        kind === 'GraphQL' ? new GraphQLError('이전 재조사 GraphQL 실패') : new Error('이전 재조사 network 실패')
      );
      await act(async () => {
        await nextTurn();
      });
      expect(screen.queryByRole('alert')).toBeNull();
      expect(screen.queryByText(/이전 재조사 .* 실패/)).toBeNull();
      expect(screen.getByText(/작업 ID: job-new/)).toBeTruthy();
      expect((screen.getAllByPlaceholderText('ex) https://linear.app')[0] as HTMLInputElement).value).toBe(
        'https://notion.so/'
      );
      expect((screen.getByRole('button', { name: '조사 요청' }) as HTMLButtonElement).disabled).toBe(false);
      const workspace = JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!);
      expect(workspace.jobId).toBe('job-new');
      expect(workspace.officialUrl).toBe('https://notion.so/');
    }
  );

  it.each([{ kind: 'network' }, { kind: 'GraphQL' }])(
    '최신 요청 응답 대기 중 도착한 이전 재조사 $kind 실패도 오류를 표시하지 않는다',
    async ({ kind }) => {
      const { requests, retries } = renderResearchRace();

      // 재조사 B 대기 중 새 요청 C를 시작하고, C 응답 전에 B의 실패가 먼저 후착한다.
      await startFailedResearchRetry(retries);
      submitResearchRequest('https://notion.so/');
      await waitFor(() => expect(requests).toHaveLength(1));
      retries[0].fail(
        kind === 'GraphQL'
          ? new GraphQLError('대기 중 이전 재조사 GraphQL 실패')
          : new Error('대기 중 이전 재조사 network 실패')
      );
      await act(async () => {
        await nextTurn();
      });
      expect(screen.queryByRole('alert')).toBeNull();
      expect(screen.queryByText(/대기 중 이전 재조사 .* 실패/)).toBeNull();
      expect(screen.getByText(/작업 ID: job-1/)).toBeTruthy();
      expect((screen.getAllByPlaceholderText('ex) https://linear.app')[0] as HTMLInputElement).value).toBe(
        'https://notion.so/'
      );
      const waiting = JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!);
      expect(waiting.requestId).toBe(requests[0].variables.requestId);
      expect(waiting.jobId).toBe('job-1');
      expect(waiting.review.name).toBe('사람 이름');
      expect(waiting.uploadedLogoUrl).toBe('https://res.cloudinary.com/demo/image/upload/v1/human-logo.png');

      // 이어서 도착한 C 성공이 자기 작업으로 이동해도 B의 오류는 나타나지 않는다.
      requests[0].respond();
      await waitFor(() => expect(navigated()).toEqual(['/products/new?researchJobId=job-new']));
      await screen.findByText(/작업 ID: job-new/);
      expect(screen.queryByRole('alert')).toBeNull();
      expect(screen.queryByText(/대기 중 이전 재조사 .* 실패/)).toBeNull();
    }
  );

  it.each([{ kind: 'network' }, { kind: 'GraphQL' }])(
    '역순 제출에서 최신 재조사의 $kind 실패는 표시되고 재조사 성공이 오류를 해제한다',
    async ({ kind }) => {
      const { requests, retries } = renderResearchRace();

      // 요청 C를 먼저 보내고 재조사 B가 C를 대체한다.
      await screen.findByRole('button', { name: '실패 작업 재조사' });
      submitResearchRequest('https://notion.so/');
      await waitFor(() => expect(requests).toHaveLength(1));
      fireEvent.click(screen.getByRole('button', { name: '실패 작업 재조사' }));
      await waitFor(() => expect(retries).toHaveLength(1));

      // 후착한 이전 C 성공은 무시되고, 최신 B의 실제 실패는 현재 실패로 표시된다.
      requests[0].respond();
      await act(async () => {
        await nextTurn();
      });
      expect(navigated()).toEqual([]);
      retries[0].fail(
        kind === 'GraphQL'
          ? new GraphQLError('역순 현재 재조사 GraphQL 실패')
          : new Error('역순 현재 재조사 network 실패')
      );
      const currentAlert = await screen.findByRole('alert');
      expect(currentAlert.textContent).toContain(
        kind === 'GraphQL' ? '역순 현재 재조사 GraphQL 실패' : '역순 현재 재조사 network 실패'
      );
      expect(screen.getByText(/작업 ID: job-1/)).toBeTruthy();
      expect((screen.getAllByPlaceholderText('ex) https://linear.app')[0] as HTMLInputElement).value).toBe(
        'https://notion.so/'
      );
      const failedWorkspace = JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!);
      expect(failedWorkspace.review.name).toBe('사람 이름');
      expect(failedWorkspace.uploadedLogoUrl).toBe('https://res.cloudinary.com/demo/image/upload/v1/human-logo.png');

      // 실패 뒤 재시도한 재조사가 성공하면 오류가 해제되고 새 logical 재조사로 이동한다.
      fireEvent.click(screen.getByRole('button', { name: '실패 작업 재조사' }));
      await waitFor(() => expect(retries).toHaveLength(2));
      expect(retries[1].variables.input?.requestId).not.toBe(retries[0].variables.input?.requestId);
      expect(screen.queryByRole('alert')).toBeNull();
      retries[1].respond();
      await waitFor(() => expect(navigated()).toEqual(['/products/new?researchJobId=job-retry']));
      await screen.findByText(/작업 ID: job-retry/);
      expect(screen.queryByRole('alert')).toBeNull();
      expect(screen.queryByText(/역순 현재 재조사 .* 실패/)).toBeNull();
    }
  );

  it.each([{ kind: 'network' }, { kind: 'GraphQL' }])(
    'route 재진입 뒤 도착한 이전 재조사 $kind 실패는 오류를 남기지 않고 편집을 보존한다',
    async ({ kind }) => {
      const { retries, lookups, client, view } = renderResearchRace({ searchParams: {} });

      // 저장된 job-1 화면에서 재조사 B를 시작한다.
      await startFailedResearchRetry(retries);

      // 응답을 기다리는 동안 같은 job의 URL로 재진입한다.
      testGlobal().researchSearchParams = { researchJobId: 'job-1' };
      view.rerender(
        <ApolloProvider client={client}>
          <ProductResearchSection />
        </ApolloProvider>
      );
      await waitFor(() => expect(lookups).toEqual(['job-1', 'job-1']));

      // 재진입이 최신이면 이전 B의 후착 실패는 오류를 남기지 않는다.
      retries[0].fail(
        kind === 'GraphQL'
          ? new GraphQLError('재진입 이전 재조사 GraphQL 실패')
          : new Error('재진입 이전 재조사 network 실패')
      );
      await act(async () => {
        await nextTurn();
      });
      expect(screen.queryByRole('alert')).toBeNull();
      expect(screen.queryByText(/재진입 이전 재조사 .* 실패/)).toBeNull();
      expect(navigated()).toEqual([]);
      expect(screen.getByText(/작업 ID: job-1/)).toBeTruthy();
      expect(((await screen.findByRole('button', { name: '실패 작업 재조사' })) as HTMLButtonElement).disabled).toBe(
        false
      );
      const workspace = JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!);
      expect(workspace.requestId).toBe('stored-request');
      expect(workspace.jobId).toBe('job-1');
      expect(workspace.review.name).toBe('사람 이름');
      expect(workspace.review.logoUrl).toBe('https://linear.app/logo.png');
      expect(workspace.uploadedLogoUrl).toBe('https://res.cloudinary.com/demo/image/upload/v1/human-logo.png');
    }
  );

  it.each([{ kind: 'network' }, { kind: 'GraphQL' }])(
    '최신 요청의 실제 $kind 실패는 표시하고 같은 URL 재시도는 같은 키로 성공해 오류를 해제한다',
    async ({ kind }) => {
      const requestedCompletedJob = { ...completedJob, id: 'job-new', officialUrl: 'https://notion.so/' };
      const { requests } = renderResearchRace({
        jobs: { 'job-1': failedRaceJob, 'job-retry': retryRaceJob, 'job-new': requestedCompletedJob },
      });

      // 실패한 작업 A 화면에서 새 요청 C가 최신 세대에서 실패하면 현재 실패를 명확히 표시한다.
      await screen.findByRole('button', { name: '실패 작업 재조사' });
      submitResearchRequest('https://notion.so/');
      await waitFor(() => expect(requests).toHaveLength(1));
      requests[0].fail(
        kind === 'GraphQL' ? new GraphQLError('현재 요청 GraphQL 실패') : new Error('현재 요청 network 실패')
      );
      const currentAlert = await screen.findByRole('alert');
      expect(currentAlert.textContent).toContain(
        kind === 'GraphQL' ? '현재 요청 GraphQL 실패' : '현재 요청 network 실패'
      );
      expect(screen.getByText(/작업 ID: job-1/)).toBeTruthy();
      expect((screen.getAllByPlaceholderText('ex) https://linear.app')[0] as HTMLInputElement).value).toBe(
        'https://notion.so/'
      );

      // 같은 URL 재시도는 대체 없이 실패한 요청의 중복 전송 키를 재사용하고, 성공하면 오류가 해제된다.
      submitResearchRequest('https://notion.so/');
      await waitFor(() => expect(requests).toHaveLength(2));
      expect(requests[1].variables.requestId).toBe(requests[0].variables.requestId);
      expect(screen.queryByRole('alert')).toBeNull();
      requests[1].respond();
      await waitFor(() => expect(navigated()).toEqual(['/products/new?researchJobId=job-new']));
      await screen.findByText(/작업 ID: job-new/);
      await screen.findByDisplayValue('Linear');
      expect(screen.queryByRole('alert')).toBeNull();
      expect(screen.queryByText(/현재 요청 .* 실패/)).toBeNull();
      const workspace = JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!);
      expect(workspace.jobId).toBe('job-new');
      expect(workspace.officialUrl).toBe('https://notion.so/');
    }
  );

  it.each([
    { failure: 'network', requestFirst: false },
    { failure: 'GraphQL', requestFirst: false },
    { failure: 'network', requestFirst: true },
    { failure: 'GraphQL', requestFirst: true },
  ])(
    '재조사 $failure 실패와 이전 요청 도착(requestFirst=$requestFirst) 뒤 같은 URL의 새 action은 새 UUID를 쓴다',
    async ({ failure, requestFirst }) => {
      vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
      const latestJob = { ...requestedRaceJob, id: 'job-latest', status: 'completed', result: null };
      const { stored, requests, retries, lookups } = renderResearchRace({
        jobs: { 'job-1': failedRaceJob, 'job-latest': latestJob },
      });

      // 실패 작업 A에서 요청 C를 시작한 뒤, 재조사 B가 그 요청을 대체한다.
      await screen.findByRole('button', { name: '실패 작업 재조사' });
      submitResearchRequest('https://notion.so/');
      await waitFor(() => expect(requests).toHaveLength(1));
      expect((screen.getByRole('button', { name: '실패 작업 재조사' }) as HTMLButtonElement).disabled).toBe(false);
      fireEvent.click(screen.getByRole('button', { name: '실패 작업 재조사' }));
      await waitFor(() => expect(retries).toHaveLength(1));
      const retryFailure =
        failure === 'GraphQL' ? new GraphQLError('합성 재조사 GraphQL 실패') : new Error('합성 재조사 network 실패');
      const finishRequest = async () => {
        requests[0].respond();
        await nextTurn();
      };
      const finishRetry = async () => {
        retries[0].fail(retryFailure);
        await nextTurn();
      };
      await act(async () => {
        if (requestFirst) {
          await finishRequest();
          await finishRetry();
        } else {
          await finishRetry();
          await finishRequest();
        }
      });

      expect(navigated()).toEqual([]);
      expect(lookups).toEqual(['job-1']);
      expect(screen.getByText(/작업 ID: job-1/)).toBeTruthy();
      const form = document.querySelector('[name="officialUrl"]')!.closest('form')!;
      const urlInput = document.querySelector('[name="officialUrl"]') as HTMLInputElement;
      expect(urlInput.value).toBe('https://notion.so/');
      const beforeLatest = JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!);
      expect(beforeLatest.review).toEqual(stored.review);
      expect(beforeLatest.uploadedLogoUrl).toBe(stored.uploadedLogoUrl);
      expect(beforeLatest.jobId).toBe('job-1');
      expect((screen.getByRole('button', { name: '조사 요청' }) as HTMLButtonElement).disabled).toBe(false);

      // 두 응답이 끝난 뒤 같은 URL의 D는 새 키를 받고, D 대기 중 중복 전송만 그 키를 공유한다.
      fireEvent.submit(form);
      await waitFor(() => expect(requests).toHaveLength(2));
      const latestRequestId = requests[1].variables.requestId;
      expect(latestRequestId).not.toBe(requests[0].variables.requestId);
      expect(latestRequestId).not.toBe(retries[0].variables.input?.requestId);
      expect(latestRequestId).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
      fireEvent.submit(form);
      await waitFor(() => expect(requests).toHaveLength(3));
      expect(requests[2].variables).toEqual({ requestId: latestRequestId, officialUrl: 'https://notion.so/' });
      const latestWorkspace = JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!);
      expect(latestWorkspace.requestId).toBe(latestRequestId);
      expect(latestWorkspace.review).toEqual(stored.review);
      expect(latestWorkspace.uploadedLogoUrl).toBe(stored.uploadedLogoUrl);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(12000);
      });
      expect(lookups).toEqual(['job-1']);
      expect(navigated()).toEqual([]);

      requests[2].respond(latestJob);
      await waitFor(() => expect(navigated()).toEqual(['/products/new?researchJobId=job-latest']));
      requests[1].respond(latestJob);
      await act(async () => {
        await nextTurn();
      });
      expect(navigated()).toEqual(['/products/new?researchJobId=job-latest']);
      expect(lookups).toEqual(['job-1', 'job-latest']);
    }
  );

  it.each(['request success', 'request network', 'request GraphQL', 'retry network', 'retry GraphQL'])(
    '이전 action의 %s 후착은 최신 요청의 중복 전송 키를 해제하지 않는다',
    async staleOutcome => {
      const staleRetry = staleOutcome.startsWith('retry');
      const latestJob = { ...requestedRaceJob, id: 'job-latest', status: 'completed', result: null };
      const { stored, requests, retries, lookups } = renderResearchRace({
        jobs: { 'job-1': failedRaceJob, 'job-latest': latestJob },
      });
      await screen.findByRole('button', { name: '실패 작업 재조사' });
      submitResearchRequest('https://notion.so/');
      await waitFor(() => expect(requests).toHaveLength(1));
      fireEvent.click(screen.getByRole('button', { name: '실패 작업 재조사' }));
      await waitFor(() => expect(retries).toHaveLength(1));
      await act(async () => {
        if (staleRetry) requests[0].respond();
        else retries[0].fail(new Error('합성 재조사 실패'));
        await nextTurn();
      });

      // C나 B의 응답이 남아 있어도 재조사가 C를 대체한 뒤 D는 새 키를 받는다.
      const form = document.querySelector('[name="officialUrl"]')!.closest('form')!;
      fireEvent.submit(form);
      await waitFor(() => expect(requests).toHaveLength(2));
      const latestRequestId = requests[1].variables.requestId;
      expect(latestRequestId).not.toBe(requests[0].variables.requestId);
      await act(async () => {
        if (staleRetry) {
          retries[0].fail(
            staleOutcome === 'retry GraphQL'
              ? new GraphQLError('이전 재조사 GraphQL 실패')
              : new Error('이전 재조사 network 실패')
          );
        } else if (staleOutcome === 'request success') {
          requests[0].respond();
        } else {
          requests[0].fail(
            staleOutcome === 'request GraphQL'
              ? new GraphQLError('이전 요청 GraphQL 실패')
              : new Error('이전 요청 network 실패')
          );
        }
        await nextTurn();
      });
      fireEvent.submit(form);
      await waitFor(() => expect(requests).toHaveLength(3));
      expect(requests[2].variables.requestId).toBe(latestRequestId);
      expect(navigated()).toEqual([]);
      expect(lookups).toEqual(['job-1']);
      const workspace = JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!);
      expect(workspace.requestId).toBe(latestRequestId);
      expect(workspace.officialUrl).toBe('https://notion.so/');
      expect(workspace.jobId).toBe('job-1');
      expect(workspace.review).toEqual(stored.review);
      expect(workspace.uploadedLogoUrl).toBe(stored.uploadedLogoUrl);

      requests[2].respond(latestJob);
      await waitFor(() => expect(navigated()).toEqual(['/products/new?researchJobId=job-latest']));
      requests[1].respond(latestJob);
      await act(async () => {
        await nextTurn();
      });
      expect(navigated()).toEqual(['/products/new?researchJobId=job-latest']);
      expect(lookups).toEqual(['job-1', 'job-latest']);
    }
  );
});

describe('research registration action ownership with real Apollo', () => {
  it.each(['success', 'upload', 'network', 'GraphQL'])(
    '같은 job 로고 pending은 URL·파일·취소를 잠그고 %s 이후 입력과 명시 제출을 보존한다',
    async outcome => {
      const logoA = 'https://res.cloudinary.com/demo/logo-a.png';
      const logoB = 'https://linear.app/replacement-b.png';
      const upload = Promise.withResolvers<{ ok: boolean; json: () => Promise<{ secure_url: string }> }>();
      vi.stubGlobal(
        'fetch',
        vi.fn(() => upload.promise)
      );
      const { stored, materializations } = await renderCompletedResearch(
        new File(['logo-a'], 'logo-a.png', { type: 'image/png' })
      );
      const url = document.querySelector<HTMLInputElement>('[name="review-logo-url"]')!;
      const file = document.querySelector<HTMLInputElement>('[name="review-logo-file"]')!;
      const cancel = screen.getByRole('button', { name: '로고 선택 취소' }) as HTMLButtonElement;
      const expectLogoDisabled = (disabled: boolean) => {
        for (const control of [url, file, cancel]) expect(control.matches(':disabled')).toBe(disabled);
      };
      const expectWorkspaceLogo = (expectedUrl: string, uploaded: string | null) => {
        for (const key of [RESEARCH_WORKSPACE_STORAGE_KEY, `${RESEARCH_WORKSPACE_STORAGE_KEY}:job-1`]) {
          expect(JSON.parse(readSavedWorkspace(key)!)).toMatchObject({
            version: 1,
            jobId: 'job-1',
            review: { logoUrl: expectedUrl },
            uploadedLogoUrl: uploaded,
          });
        }
      };
      expectLogoDisabled(false);
      fireEvent.click(screen.getByRole('button', { name: '검토 내용으로 미발행 생성' }));
      await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
      expectLogoDisabled(true);
      expect(url.value).toBe(stored.review.logoUrl);
      expectWorkspaceLogo(stored.review.logoUrl, null);
      expect(materializations).toHaveLength(0);
      expect((document.querySelector('[name="review-name"]') as HTMLInputElement).disabled).toBe(false);
      expect((screen.getByRole('button', { name: '조사 요청' }) as HTMLButtonElement).disabled).toBe(false);

      if (outcome === 'upload') {
        await act(async () => upload.reject(new Error('합성 A 업로드 실패')));
        await waitFor(() => expectLogoDisabled(false));
        expect(materializations).toHaveLength(0);
        expect(url.value).toBe(stored.review.logoUrl);
        expectWorkspaceLogo(stored.review.logoUrl, null);
        expect(notifications.show).toHaveBeenCalledWith({
          message: '로고 업로드에 실패했습니다. 다시 시도해주세요.',
          color: 'red',
        });
      } else {
        await act(async () => upload.resolve({ ok: true, json: async () => ({ secure_url: logoA }) }));
        await waitFor(() => expect(materializations).toHaveLength(1));
        expectLogoDisabled(true);
        expect(url.value).toBe(logoA);
        expectWorkspaceLogo(logoA, logoA);
        expect(materializations[0].variables.input.logoUrl).toBe(logoA);
        if (outcome === 'success') {
          materializations[0].respond({ id: 'prod-a', slug: 'uploaded-a', name: 'A' });
          await waitFor(() => expect(navigated()).toEqual(['/products/uploaded-a']));
          expectWorkspaceLogo(logoA, logoA);
          expect(fetch).toHaveBeenCalledTimes(1);
          return;
        }
        materializations[0].fail(
          outcome === 'GraphQL' ? new GraphQLError('합성 A GraphQL 실패') : new Error('합성 A network 실패')
        );
        expect((await screen.findByRole('alert')).textContent).toContain(`합성 A ${outcome} 실패`);
        expectLogoDisabled(false);
      }

      fireEvent.change(url, { target: { value: logoB } });
      expect(url.value).toBe(logoB);
      expectWorkspaceLogo(logoB, outcome === 'upload' ? null : logoA);
      expect(navigated()).toEqual([]);
      expect(materializations).toHaveLength(outcome === 'upload' ? 0 : 1);
      fireEvent.click(screen.getByRole('button', { name: '검토 내용으로 미발행 생성' }));
      await waitFor(() => expect(materializations).toHaveLength(outcome === 'upload' ? 1 : 2));
      const resubmission = materializations.at(-1)!;
      expect(resubmission.variables.input.logoUrl).toBe(logoB);
      expect(url.value).toBe(logoB);
      expectLogoDisabled(true);
      expectWorkspaceLogo(logoB, outcome === 'upload' ? null : logoA);
      expect(fetch).toHaveBeenCalledTimes(1);
      resubmission.respond({ id: 'prod-b', slug: 'replacement-b', name: 'B' });
      await waitFor(() => expect(navigated()).toEqual(['/products/replacement-b']));
      expectWorkspaceLogo(logoB, outcome === 'upload' ? null : logoA);
    }
  );

  it.each([
    { outcome: 'success', requestFirst: false },
    { outcome: 'network', requestFirst: false },
    { outcome: 'GraphQL', requestFirst: false },
    { outcome: 'success', requestFirst: true },
    { outcome: 'network', requestFirst: true },
    { outcome: 'GraphQL', requestFirst: true },
  ])('B job 선착=$requestFirst, A=$outcome: 최신 화면을 보존한다', async ({ outcome, requestFirst }) => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const { requests, materializations, lookups, jobs } = await renderMaterializeRace();
    // A 등록은 진행 중이지만 새 조사 action은 그대로 사용할 수 있다.
    expect((screen.getByRole('button', { name: '조사 요청' }) as HTMLButtonElement).disabled).toBe(false);
    submitResearchRequest('https://notion.so/');
    await waitFor(() => expect(requests).toHaveLength(1));
    if (requestFirst) {
      requests[0].respond();
      await screen.findByText(/작업 ID: job-new · 상태: pending/);
    } else {
      // B의 identity는 아직 반환하지 않는다. job ID만 검사하는 구현은 이 창에서 실패한다.
      expect(lookups).toEqual(['job-1']);
      expect(screen.getByText(/작업 ID: job-1/)).toBeTruthy();
      fireEvent.change(document.querySelector('[name="review-name"]')!, { target: { value: 'B 대기 중 사람 편집' } });
      fireEvent.change(document.querySelector('[name="review-logo-url"]')!, {
        target: { value: 'https://notion.so/current-logo.png' },
      });
    }
    const workspaceBefore = JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!);
    const routesBefore = [...navigated()];
    await act(async () => {
      finishStaleMaterialization(materializations[0], outcome);
      await nextTurn();
    });
    expect(navigated()).toEqual(routesBefore);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(notifications.show).not.toHaveBeenCalled();
    expect(JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!)).toEqual(workspaceBefore);
    expect(workspaceBefore.materializedSlug).toBeNull();
    if (!requestFirst) {
      expect((document.querySelector('[name="officialUrl"]') as HTMLInputElement).value).toBe('https://notion.so/');
      expect((document.querySelector('[name="review-name"]') as HTMLInputElement).value).toBe('B 대기 중 사람 편집');
      expect((document.querySelector('[name="review-logo-url"]') as HTMLInputElement).value).toBe(
        'https://notion.so/current-logo.png'
      );
      expect((screen.getByRole('button', { name: '조사 요청 중...' }) as HTMLButtonElement).disabled).toBe(true);
      expect(lookups).toEqual(['job-1']);
      requests[0].respond();
      await screen.findByText(/작업 ID: job-new · 상태: pending/);
    }
    expect(navigated()).toEqual(['/products/new?researchJobId=job-new']);
    const latest = JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!);
    expect(latest.jobId).toBe('job-new');
    expect(latest.review.name).toBe('');
    expect(latest.review.logoUrl).toBe('');
    expect(latest.uploadedLogoUrl).toBeNull();
    expect(latest.materializedSlug).toBeNull();
    // A의 후처리가 B의 가시 3초 polling을 멈추거나 completed 결과 조회를 막지 않는다.
    expect(lookups).toEqual(['job-1', 'job-new']);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(lookups).toEqual(['job-1', 'job-new', 'job-new']);
    jobs['job-new'] = { ...completedJob, id: 'job-new', officialUrl: 'https://notion.so/' };
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    await screen.findByDisplayValue('Linear');
    expect(screen.getByText(/작업 ID: job-new · 상태: completed/)).toBeTruthy();
    expect((screen.getByRole('button', { name: '검토 내용으로 미발행 생성' }) as HTMLButtonElement).disabled).toBe(
      false
    );
  });

  it.each(['success', 'network', 'GraphQL'])('B 실패 후 A %s 후착은 현재 오류와 편집을 보존한다', async outcome => {
    const { requests, materializations, lookups, stored } = await renderMaterializeRace();
    submitResearchRequest('https://notion.so/');
    await waitFor(() => expect(requests).toHaveLength(1));
    requests[0].fail(new GraphQLError('현재 B 요청 실패'));
    expect((await screen.findByRole('alert')).textContent).toContain('현재 B 요청 실패');
    const latest = JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!);
    await act(async () => {
      finishStaleMaterialization(materializations[0], outcome);
      await nextTurn();
    });
    expect(screen.getByRole('alert').textContent).toContain('현재 B 요청 실패');
    expect(screen.queryByText(/이전 등록 .* 실패/)).toBeNull();
    expect(notifications.show).not.toHaveBeenCalled();
    expect(navigated()).toEqual([]);
    expect(lookups).toEqual(['job-1']);
    expect(JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!)).toEqual(latest);
    expect(latest.review).toEqual(stored.review);
    expect(latest.uploadedLogoUrl).toBe(stored.uploadedLogoUrl);
    expect(latest.materializedSlug).toBeNull();
    expect((document.querySelector('[name="officialUrl"]') as HTMLInputElement).value).toBe('https://notion.so/');
    expect((screen.getByRole('button', { name: '검토 내용으로 미발행 생성' }) as HTMLButtonElement).disabled).toBe(
      false
    );
  });

  it.each(['success', 'network', 'GraphQL'])(
    'route 재진입 후 A %s 후착은 현재 등록을 방해하지 않는다',
    async outcome => {
      const { materializations, lookups, client, view, stored } = await renderMaterializeRace();
      // job identity는 같아도 route action이 새 세대다. 클라이언트도 교체하지 않는다.
      testGlobal().researchSearchParams = { researchJobId: 'job-1' };
      view.rerender(
        <ApolloProvider client={client}>
          <ProductResearchSection />
        </ApolloProvider>
      );
      await waitFor(() => expect(lookups).toEqual(['job-1', 'job-1']));
      fireEvent.click(await screen.findByRole('button', { name: '검토 내용으로 미발행 생성' }));
      await waitFor(() => expect(materializations).toHaveLength(2));
      await act(async () => {
        finishStaleMaterialization(materializations[0], outcome);
        await nextTurn();
      });
      expect((screen.getByRole('button', { name: '생성 중...' }) as HTMLButtonElement).disabled).toBe(true);
      expect(screen.queryByRole('alert')).toBeNull();
      expect(notifications.show).not.toHaveBeenCalled();
      expect(navigated()).toEqual([]);
      expect(JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!).materializedSlug).toBeNull();

      materializations[1].fail(
        outcome === 'GraphQL'
          ? new GraphQLError('현재 검토 등록 GraphQL 실패')
          : new Error('현재 검토 등록 network 실패')
      );
      expect((await screen.findByRole('alert')).textContent).toContain('현재 검토 등록');
      expect((document.querySelector('[name="review-name"]') as HTMLInputElement).value).toBe(stored.review.name);
      expect((document.querySelector('[name="review-logo-url"]') as HTMLInputElement).value).toBe(
        stored.review.logoUrl
      );
      expect(JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!).review).toEqual(stored.review);
      // 현재 등록 실패 뒤 입력을 바꾸지 않은 재제출은 서버가 돌려준 기존 Product로 복구한다.
      fireEvent.click(screen.getByRole('button', { name: '검토 내용으로 미발행 생성' }));
      await waitFor(() => expect(materializations).toHaveLength(3));
      expect(screen.queryByRole('alert')).toBeNull();
      expect(materializations[2].variables).toEqual(materializations[1].variables);
      materializations[2].respond({ id: 'prod-existing', slug: 'existing-product', name: '기존 Product' });
      await waitFor(() => expect(navigated()).toEqual(['/products/existing-product']));
      expect(JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!).materializedSlug).toBe('existing-product');
      expect(notifications.show).toHaveBeenCalledTimes(1);
      expect(notifications.show).toHaveBeenCalledWith({ message: '미발행 서비스가 생성되었습니다.', color: 'teal' });
    }
  );

  it.each(['success', 'network', 'GraphQL'])('재조사 B job 반환 전 A %s 후착을 무시한다', async outcome => {
    const { retries, materializations, lookups, jobs, stored } = await renderMaterializeRace();
    // 등록 서버 처리와 별개인 최신 조회가 job 실패를 돌려주면 기존 재조사 경로를 사용할 수 있다.
    jobs['job-1'] = failedRaceJob;
    fireEvent.click(screen.getByRole('button', { name: '결과 새로고침' }));
    fireEvent.click(await screen.findByRole('button', { name: '실패 작업 재조사' }));
    await waitFor(() => expect(retries).toHaveLength(1));
    const latest = JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!);
    await act(async () => {
      finishStaleMaterialization(materializations[0], outcome);
      await nextTurn();
    });
    expect(navigated()).toEqual([]);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(notifications.show).not.toHaveBeenCalled();
    expect(lookups).toEqual(['job-1', 'job-1']);
    expect(JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!)).toEqual(latest);
    expect(latest.review).toEqual(stored.review);
    expect(latest.uploadedLogoUrl).toBe(stored.uploadedLogoUrl);
    expect(latest.materializedSlug).toBeNull();
    expect((screen.getByRole('button', { name: '재조사 요청 중...' }) as HTMLButtonElement).disabled).toBe(true);
    // 최신 재조사만 새 job 주소를 소유한다.
    jobs['job-retry'] = { ...completedJob, id: 'job-retry' };
    retries[0].respond();
    await waitFor(() => expect(navigated()).toEqual(['/products/new?researchJobId=job-retry']));
  });

  it.each(['success', 'network'])('새 요청 후 이전 로고 %s 후착은 화면과 등록을 바꾸지 않는다', async outcome => {
    const upload = Promise.withResolvers<{ ok: boolean; json: () => Promise<{ secure_url: string }> }>();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => upload.promise)
    );
    const { requests, materializations, lookups } = await renderMaterializeRace(
      new File(['old-logo'], 'old-logo.png', { type: 'image/png' })
    );
    submitResearchRequest('https://notion.so/');
    await waitFor(() => expect(requests).toHaveLength(1));
    // B의 job ID를 반환하기 전에 최신 사람 편집과 로고 URL을 저장한다.
    fireEvent.change(document.querySelector('[name="review-name"]')!, { target: { value: '새 요청 대기 편집' } });
    fireEvent.change(document.querySelector('[name="review-logo-url"]')!, {
      target: { value: 'https://notion.so/latest.png' },
    });
    const latest = JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!);
    await act(async () => {
      if (outcome === 'success') {
        upload.resolve({
          ok: true,
          json: async () => ({ secure_url: 'https://res.cloudinary.com/demo/old-logo.png' }),
        });
      } else {
        upload.reject(new Error('이전 로고 업로드 실패'));
      }
      await nextTurn();
    });
    expect(materializations).toHaveLength(0);
    expect(lookups).toEqual(['job-1']);
    expect(navigated()).toEqual([]);
    expect(notifications.show).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
    expect((document.querySelector('[name="review-name"]') as HTMLInputElement).value).toBe('새 요청 대기 편집');
    expect((document.querySelector('[name="review-logo-url"]') as HTMLInputElement).value).toBe(
      'https://notion.so/latest.png'
    );
    expect(screen.getByAltText('조사 로고 미리보기')).toBeTruthy();
    expect(JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!)).toEqual(latest);
    expect(latest.materializedSlug).toBeNull();
    expect(latest.uploadedLogoUrl).toBeNull();
  });

  it.each(['success', 'network'])(
    'route 재진입 후 이전 로고 %s 후착은 최신 업로드를 방해하지 않는다',
    async outcome => {
      const oldUpload = Promise.withResolvers<{ ok: boolean; json: () => Promise<{ secure_url: string }> }>();
      const currentUpload = Promise.withResolvers<{ ok: boolean; json: () => Promise<{ secure_url: string }> }>();
      vi.stubGlobal('fetch', vi.fn().mockReturnValueOnce(oldUpload.promise).mockReturnValueOnce(currentUpload.promise));
      const { materializations, lookups, view, client } = await renderMaterializeRace(
        new File(['old-logo'], 'old-logo.png', { type: 'image/png' })
      );
      testGlobal().researchSearchParams = { researchJobId: 'job-1' };
      view.rerender(
        <ApolloProvider client={client}>
          <ProductResearchSection />
        </ApolloProvider>
      );
      await waitFor(() => expect(lookups).toEqual(['job-1', 'job-1']));
      await screen.findByRole('button', { name: '검토 내용으로 미발행 생성' });
      fireEvent.change(document.querySelector('[name="review-logo-file"]')!, {
        target: { files: [new File(['current-logo'], 'current-logo.png', { type: 'image/png' })] },
      });
      fireEvent.click(screen.getByRole('button', { name: '검토 내용으로 미발행 생성' }));
      await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
      const latest = JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!);
      await act(async () => {
        if (outcome === 'success') {
          oldUpload.resolve({
            ok: true,
            json: async () => ({ secure_url: 'https://res.cloudinary.com/demo/old-logo.png' }),
          });
        } else {
          oldUpload.reject(new Error('이전 로고 업로드 실패'));
        }
        await nextTurn();
      });
      expect(materializations).toHaveLength(0);
      expect(notifications.show).not.toHaveBeenCalled();
      expect(navigated()).toEqual([]);
      expect((screen.getByRole('button', { name: '생성 중...' }) as HTMLButtonElement).disabled).toBe(true);
      expect((document.querySelector('[name="review-logo-file"]') as HTMLInputElement).disabled).toBe(true);
      expect(screen.getByText('current-logo.png')).toBeTruthy();
      expect(JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!)).toEqual(latest);
      expect(latest.logoFileName).toBe('current-logo.png');
      expect(latest.materializedSlug).toBeNull();
      currentUpload.resolve({
        ok: true,
        json: async () => ({ secure_url: 'https://res.cloudinary.com/demo/current-logo.png' }),
      });
      await waitFor(() => expect(materializations).toHaveLength(1));
      expect(materializations[0].variables.input.logoUrl).toBe('https://res.cloudinary.com/demo/current-logo.png');
      materializations[0].respond({ id: 'prod-current', slug: 'current', name: '현재 Product' });
      await waitFor(() => {
        expect(navigated()).toEqual(['/products/current']);
        expect(JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!).materializedSlug).toBe('current');
      });
      const completed = JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!);
      expect(completed.uploadedLogoUrl).toBe('https://res.cloudinary.com/demo/current-logo.png');
      expect(completed.materializedSlug).toBe('current');
    }
  );

  it('URL 로고의 즉시 await 경계에서 새 요청이 시작돼도 이전 등록 mutation을 보내지 않는다', async () => {
    const { materializations, requests, lookups, view, client } = await renderMaterializeRace();
    testGlobal().researchSearchParams = { researchJobId: 'job-1' };
    view.rerender(
      <ApolloProvider client={client}>
        <ProductResearchSection />
      </ApolloProvider>
    );
    await waitFor(() => expect(lookups).toEqual(['job-1', 'job-1']));
    await screen.findByRole('button', { name: '검토 내용으로 미발행 생성' });
    act(() => {
      fireEvent.submit(document.querySelector('[name="review-name"]')!.closest('form')!);
      submitResearchRequest('https://notion.so/');
    });
    await waitFor(() => expect(requests).toHaveLength(1));
    await act(async () => {
      await nextTurn();
    });
    // 첫 fixture 등록 외에 대체된 두 번째 등록은 전송되지 않는다.
    expect(materializations).toHaveLength(1);
    expect(notifications.show).not.toHaveBeenCalled();
    expect(navigated()).toEqual([]);
    expect(JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!).materializedSlug).toBeNull();
  });

  it.each(['success', 'network', 'GraphQL'])(
    'route를 떠난 A의 %s 후착은 새 workspace로 이동하지 못한다',
    async outcome => {
      const { materializations, jobs, client, view } = await renderMaterializeRace();
      view.unmount();
      jobs['job-new'] = {
        ...completedJob,
        id: 'job-new',
        officialUrl: 'https://notion.so/',
        result: {
          ...completedJob.result,
          name: { value: 'Notion', anchors: [], evidenceType: 'OFFICIAL' },
          suggestedSlug: 'notion',
        },
      };
      testGlobal().researchSearchParams = { researchJobId: 'job-new' };
      render(
        <ApolloProvider client={client}>
          <ProductResearchSection />
        </ApolloProvider>
      );
      await screen.findByDisplayValue('Notion');
      await waitFor(() =>
        expect(JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!).review.name).toBe('Notion')
      );
      const latest = JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!);
      await act(async () => {
        finishStaleMaterialization(materializations[0], outcome);
        await nextTurn();
      });
      expect(navigated()).toEqual([]);
      expect(notifications.show).not.toHaveBeenCalled();
      expect(screen.queryByRole('alert')).toBeNull();
      expect(screen.getByDisplayValue('Notion')).toBeTruthy();
      expect(JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!)).toEqual(latest);
      expect(latest.jobId).toBe('job-new');
      expect(latest.materializedSlug).toBeNull();
    }
  );
});

describe('materialized research explicit reentry recovery with real Apollo', () => {
  it('응답 유실 뒤 저장 slug나 제안 slug가 아니라 기존 Product의 현재 slug로 명시 복구한다', async () => {
    const { materializations, requests, retries, stored } = await renderMaterializedReentry();
    const submit = screen.getByRole('button', { name: '검토 내용으로 미발행 생성' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(false);
    fireEvent.click(submit);
    await waitFor(() => expect(materializations).toHaveLength(2));
    expect(materializations[1].variables).toEqual(materializations[0].variables);
    expect((screen.getByRole('button', { name: '생성 중...' }) as HTMLButtonElement).disabled).toBe(true);
    materializations[1].respond({
      id: 'prod-existing',
      slug: 'renamed-current-product',
      name: '사람이 고친 기존 제품',
    });
    await waitFor(() => expect(navigated()).toEqual(['/products/renamed-current-product']));
    const workspace = JSON.parse(readSavedWorkspace(`${RESEARCH_WORKSPACE_STORAGE_KEY}:job-1`)!);
    expect(workspace.review).toEqual(stored.review);
    expect(workspace.materializedSlug).toBe('renamed-current-product');
    expect(requests).toHaveLength(0);
    expect(retries).toHaveLength(0);
    expect(fetch).not.toHaveBeenCalled();
    expect(notifications.show).toHaveBeenCalledTimes(1);
  });

  it.each(['network', 'GraphQL'])('현재 %s 복구 실패는 입력을 보존하고 같은 검토 재제출을 허용한다', async kind => {
    const { materializations, stored, requests, retries } = await renderMaterializedReentry();
    fireEvent.click(screen.getByRole('button', { name: '검토 내용으로 미발행 생성' }));
    await waitFor(() => expect(materializations).toHaveLength(2));
    materializations[1].fail(
      kind === 'GraphQL' ? new GraphQLError('현재 복구 GraphQL 실패') : new Error('현재 복구 network 실패')
    );
    expect((await screen.findByRole('alert')).textContent).toContain(`현재 복구 ${kind} 실패`);
    expect((document.querySelector('[name="review-name"]') as HTMLInputElement).value).toBe(stored.review.name);
    expect((document.querySelector('[name="review-summary"]') as HTMLTextAreaElement).value).toBe(
      stored.review.summary
    );
    expect((document.querySelector('[name="review-logo-url"]') as HTMLInputElement).value).toBe(stored.review.logoUrl);
    const failedWorkspace = JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!);
    expect(failedWorkspace.review).toEqual(stored.review);
    expect(failedWorkspace.uploadedLogoUrl).toBe(stored.uploadedLogoUrl);
    expect(failedWorkspace.materializedSlug).toBeNull();
    expect(navigated()).toEqual([]);
    expect(notifications.show).not.toHaveBeenCalled();
    expect((screen.getByRole('button', { name: '검토 내용으로 미발행 생성' }) as HTMLButtonElement).disabled).toBe(
      false
    );
    fireEvent.click(screen.getByRole('button', { name: '검토 내용으로 미발행 생성' }));
    await waitFor(() => expect(materializations).toHaveLength(3));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(materializations[2].variables).toEqual(materializations[1].variables);
    materializations[2].respond({ id: 'prod-existing', slug: 'renamed-after-failure', name: '편집 보존 제품' });
    await waitFor(() => expect(navigated()).toEqual(['/products/renamed-after-failure']));
    expect(requests).toHaveLength(0);
    expect(retries).toHaveLength(0);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(['success', 'network', 'GraphQL'])(
    '새 요청 job ID 반환 전 이전 복구 %s 응답은 현재 오류와 workspace를 바꾸지 않는다',
    async outcome => {
      const { materializations, requests, lookups } = await renderMaterializedReentry();
      fireEvent.click(screen.getByRole('button', { name: '검토 내용으로 미발행 생성' }));
      await waitFor(() => expect(materializations).toHaveLength(2));
      submitResearchRequest('https://notion.so/');
      await waitFor(() => expect(requests).toHaveLength(1));
      fireEvent.change(document.querySelector('[name="review-name"]')!, { target: { value: '최신 action의 편집' } });
      requests[0].fail(new GraphQLError('현재 새 조사 실패'));
      expect((await screen.findByRole('alert')).textContent).toContain('현재 새 조사 실패');
      const workspace = JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!);
      await act(async () => {
        finishStaleMaterialization(materializations[1], outcome);
        await nextTurn();
      });
      expect(screen.getByRole('alert').textContent).toContain('현재 새 조사 실패');
      expect((document.querySelector('[name="review-name"]') as HTMLInputElement).value).toBe('최신 action의 편집');
      expect(JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!)).toEqual(workspace);
      expect(lookups).toEqual(['job-1', 'job-1']);
      expect(navigated()).toEqual([]);
      expect(notifications.show).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    }
  );

  it.each(['success', 'network', 'GraphQL'])(
    '같은 job route 재진입 뒤 이전 복구 %s 응답은 최신 복구의 대기·이동 권한을 침범하지 않는다',
    async outcome => {
      const { materializations, lookups, client, view, stored } = await renderMaterializedReentry();
      fireEvent.click(screen.getByRole('button', { name: '검토 내용으로 미발행 생성' }));
      await waitFor(() => expect(materializations).toHaveLength(2));
      // query가 바뀐 같은 job 재진입도 공유 action 세대를 새로 연다.
      testGlobal().researchSearchParams = {};
      view.rerender(
        <ApolloProvider client={client}>
          <ProductResearchSection />
        </ApolloProvider>
      );
      await waitFor(() => expect(lookups).toEqual(['job-1', 'job-1', 'job-1']));
      await screen.findByText(/작업 ID: job-1 · 상태: completed/);
      fireEvent.click(screen.getByRole('button', { name: '검토 내용으로 미발행 생성' }));
      await waitFor(() => expect(materializations).toHaveLength(3));
      const workspace = JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!);
      await act(async () => {
        finishStaleMaterialization(materializations[1], outcome);
        await nextTurn();
      });
      expect((screen.getByRole('button', { name: '생성 중...' }) as HTMLButtonElement).disabled).toBe(true);
      expect(screen.queryByRole('alert')).toBeNull();
      expect(JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!)).toEqual(workspace);
      expect(workspace.review).toEqual(stored.review);
      expect(workspace.materializedSlug).toBeNull();
      expect(navigated()).toEqual([]);
      expect(notifications.show).not.toHaveBeenCalled();
      materializations[2].respond({ id: 'prod-existing', slug: 'latest-reentry-product', name: '기존 제품' });
      await waitFor(() => expect(navigated()).toEqual(['/products/latest-reentry-product']));
      expect(fetch).not.toHaveBeenCalled();
    }
  );

  it.each(['success', 'network', 'GraphQL'])('재조사 job ID 반환 전 이전 복구 %s 후착을 무시한다', async outcome => {
    const { materializations, retries, jobs, stored } = await renderMaterializedReentry();
    fireEvent.click(screen.getByRole('button', { name: '검토 내용으로 미발행 생성' }));
    await waitFor(() => expect(materializations).toHaveLength(2));
    // 독립적인 최신 조회가 실패 작업을 돌려준 경우에도 기존 retry action의 fence를 유지한다.
    jobs['job-1'] = { ...failedRaceJob, materializedProductId: 'prod-existing' };
    fireEvent.click(screen.getByRole('button', { name: '결과 새로고침' }));
    fireEvent.click(await screen.findByRole('button', { name: '실패 작업 재조사' }));
    await waitFor(() => expect(retries).toHaveLength(1));
    const workspace = JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!);
    await act(async () => {
      finishStaleMaterialization(materializations[1], outcome);
      await nextTurn();
    });
    expect((screen.getByRole('button', { name: '재조사 요청 중...' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!)).toEqual(workspace);
    expect(workspace.review).toEqual(stored.review);
    expect(workspace.materializedSlug).toBeNull();
    expect(navigated()).toEqual([]);
    expect(notifications.show).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    retries[0].fail(new Error('현재 재조사 실패'));
    expect((await screen.findByRole('alert')).textContent).toContain('현재 재조사 실패');
  });
});

describe('review registration supersedes pending research with real Apollo', () => {
  it.each([
    { outcome: 'success', requestFirst: true },
    { outcome: 'network', requestFirst: true },
    { outcome: 'GraphQL', requestFirst: true },
    { outcome: 'success', requestFirst: false },
    { outcome: 'network', requestFirst: false },
    { outcome: 'GraphQL', requestFirst: false },
  ])('B 요청 뒤 A 등록: B=$outcome 선착=$requestFirst도 A만 이동한다', async ({ outcome, requestFirst }) => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const { stored, requests, materializations, lookups } = await renderCompletedResearch();
    submitResearchRequest('https://notion.so/');
    await waitFor(() => expect(requests).toHaveLength(1));
    const submit = screen.getByRole('button', { name: '검토 내용으로 미발행 생성' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(false);
    fireEvent.click(submit);
    await waitFor(() => expect(materializations).toHaveLength(1));
    expect(materializations[0].variables.input).toMatchObject({ researchJobId: 'job-1', ...stored.review });
    const workspace = JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!);
    if (requestFirst) {
      await act(async () => {
        finishStaleRequest(requests[0], outcome);
        await nextTurn();
      });
      expect((screen.getByRole('button', { name: '생성 중...' }) as HTMLButtonElement).disabled).toBe(true);
      expect(screen.queryByRole('alert')).toBeNull();
      expect(notifications.show).not.toHaveBeenCalled();
      expect(navigated()).toEqual([]);
      expect(JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!)).toEqual(workspace);
    }
    materializations[0].respond({ id: 'prod-a', slug: 'actual-a-product', name: '서버 Product A' });
    await waitFor(() => expect(navigated()).toEqual(['/products/actual-a-product']));
    await waitFor(() =>
      expect(JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!).materializedSlug).toBe('actual-a-product')
    );
    const completed = JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!);
    if (!requestFirst) {
      await act(async () => {
        finishStaleRequest(requests[0], outcome);
        await nextTurn();
      });
    }
    await act(async () => {
      await vi.advanceTimersByTimeAsync(9000);
    });
    expect(lookups).toEqual(['job-1']);
    expect(screen.getByText(/작업 ID: job-1 · 상태: completed/)).toBeTruthy();
    expect((document.querySelector('[name="officialUrl"]') as HTMLInputElement).value).toBe('https://notion.so/');
    expect((document.querySelector('[name="review-name"]') as HTMLInputElement).value).toBe(stored.review.name);
    expect((document.querySelector('[name="review-logo-url"]') as HTMLInputElement).value).toBe(stored.review.logoUrl);
    expect(completed.review).toEqual(stored.review);
    expect(completed.uploadedLogoUrl).toBe(stored.uploadedLogoUrl);
    expect(completed.jobId).toBe('job-1');
    expect(completed.materializedSlug).toBe('actual-a-product');
    expect(JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!)).toEqual(completed);
    expect(JSON.parse(readSavedWorkspace(`${RESEARCH_WORKSPACE_STORAGE_KEY}:job-1`)!)).toEqual(completed);
    expect(readSavedWorkspace(`${RESEARCH_WORKSPACE_STORAGE_KEY}:job-new`)).toBeNull();
    expect(navigated()).toEqual(['/products/actual-a-product']);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(notifications.show).toHaveBeenCalledTimes(1);
    expect(notifications.show).toHaveBeenCalledWith({ message: '미발행 서비스가 생성되었습니다.', color: 'teal' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(['success', 'network', 'GraphQL'])(
    'B %s가 A 첫 로고 await 중 도착해도 A 업로드와 등록을 보존한다',
    async outcome => {
      const upload = Promise.withResolvers<{ ok: boolean; json: () => Promise<{ secure_url: string }> }>();
      vi.stubGlobal(
        'fetch',
        vi.fn(() => upload.promise)
      );
      const { stored, requests, materializations, lookups } = await renderCompletedResearch(
        new File(['current-a-logo'], 'current-a.png', { type: 'image/png' })
      );
      submitResearchRequest('https://notion.so/');
      await waitFor(() => expect(requests).toHaveLength(1));
      fireEvent.click(screen.getByRole('button', { name: '검토 내용으로 미발행 생성' }));
      await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
      expect(materializations).toHaveLength(0);
      const workspace = JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!);
      await act(async () => {
        finishStaleRequest(requests[0], outcome);
        await nextTurn();
      });
      expect(lookups).toEqual(['job-1']);
      expect(screen.queryByRole('alert')).toBeNull();
      expect(navigated()).toEqual([]);
      expect(notifications.show).not.toHaveBeenCalled();
      expect((screen.getByRole('button', { name: '생성 중...' }) as HTMLButtonElement).disabled).toBe(true);
      expect((document.querySelector('[name="review-logo-file"]') as HTMLInputElement).disabled).toBe(true);
      expect(screen.getByText('current-a.png')).toBeTruthy();
      expect(JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!)).toEqual(workspace);
      upload.resolve({ ok: true, json: async () => ({ secure_url: 'https://res.cloudinary.com/demo/current-a.png' }) });
      await waitFor(() => expect(materializations).toHaveLength(1));
      expect(materializations[0].variables.input).toMatchObject({
        researchJobId: 'job-1',
        name: stored.review.name,
        slug: stored.review.slug,
        logoUrl: 'https://res.cloudinary.com/demo/current-a.png',
      });
      materializations[0].respond({ id: 'prod-a', slug: 'uploaded-a-product', name: '현재 A' });
      await waitFor(() => expect(navigated()).toEqual(['/products/uploaded-a-product']));
      await waitFor(() =>
        expect(JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!).materializedSlug).toBe(
          'uploaded-a-product'
        )
      );
      const completed = JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!);
      expect(completed.review).toEqual({ ...stored.review, logoUrl: 'https://res.cloudinary.com/demo/current-a.png' });
      expect(completed.uploadedLogoUrl).toBe('https://res.cloudinary.com/demo/current-a.png');
      expect(completed.logoFileName).toBe('current-a.png');
      expect(completed.materializedSlug).toBe('uploaded-a-product');
      expect(lookups).toEqual(['job-1']);
      expect(screen.queryByRole('alert')).toBeNull();
      expect(notifications.show).toHaveBeenCalledTimes(1);
    }
  );

  it.each(['network', 'GraphQL'])(
    'A 현재 %s 실패 뒤 같은 검토 재제출은 B가 아니라 기존 Product로 복구한다',
    async outcome => {
      const { stored, requests, materializations, lookups } = await renderCompletedResearch();
      submitResearchRequest('https://notion.so/');
      await waitFor(() => expect(requests).toHaveLength(1));
      fireEvent.click(screen.getByRole('button', { name: '검토 내용으로 미발행 생성' }));
      await waitFor(() => expect(materializations).toHaveLength(1));
      materializations[0].fail(
        outcome === 'GraphQL' ? new GraphQLError('현재 A GraphQL 실패') : new Error('현재 A network 실패')
      );
      expect((await screen.findByRole('alert')).textContent).toContain(`현재 A ${outcome} 실패`);
      const failed = JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!);
      await act(async () => {
        requests[0].respond();
        await nextTurn();
      });
      expect(screen.getByRole('alert').textContent).toContain(`현재 A ${outcome} 실패`);
      expect(JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!)).toEqual(failed);
      expect(failed.review).toEqual(stored.review);
      expect(failed.uploadedLogoUrl).toBe(stored.uploadedLogoUrl);
      expect(failed.materializedSlug).toBeNull();
      expect((document.querySelector('[name="review-name"]') as HTMLInputElement).value).toBe(stored.review.name);
      expect((document.querySelector('[name="review-logo-url"]') as HTMLInputElement).value).toBe(
        stored.review.logoUrl
      );
      expect(navigated()).toEqual([]);
      expect(notifications.show).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: '검토 내용으로 미발행 생성' }));
      await waitFor(() => expect(materializations).toHaveLength(2));
      expect(screen.queryByRole('alert')).toBeNull();
      expect(materializations[1].variables).toEqual(materializations[0].variables);
      materializations[1].respond({ id: 'prod-existing-a', slug: 'renamed-existing-a', name: '기존 A 제품' });
      await waitFor(() => expect(navigated()).toEqual(['/products/renamed-existing-a']));
      expect(lookups).toEqual(['job-1']);
      expect(requests).toHaveLength(1);
      expect(JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!).materializedSlug).toBe(
        'renamed-existing-a'
      );
      expect(fetch).not.toHaveBeenCalled();
    }
  );

  it.each(['success', 'network', 'GraphQL'])(
    'A 실패 뒤 새 요청 대기 중 이전 B %s는 새 UUID와 중복 키를 해제하지 않는다',
    async outcome => {
      const { stored, requests, materializations, lookups, jobs } = await renderCompletedResearch();
      submitResearchRequest('https://notion.so/');
      await waitFor(() => expect(requests).toHaveLength(1));
      fireEvent.click(screen.getByRole('button', { name: '검토 내용으로 미발행 생성' }));
      await waitFor(() => expect(materializations).toHaveLength(1));
      materializations[0].fail(new Error('현재 A 실패'));
      await screen.findByRole('alert');
      const form = document.querySelector('[name="officialUrl"]')!.closest('form')!;
      fireEvent.submit(form);
      await waitFor(() => expect(requests).toHaveLength(2));
      const currentId = requests[1].variables.requestId;
      expect(currentId).not.toBe(requests[0].variables.requestId);
      expect(currentId).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
      const workspace = JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!);
      await act(async () => {
        finishStaleRequest(requests[0], outcome);
        await nextTurn();
      });
      expect((screen.getByRole('button', { name: '조사 요청 중...' }) as HTMLButtonElement).disabled).toBe(true);
      expect(screen.queryByRole('alert')).toBeNull();
      expect(notifications.show).not.toHaveBeenCalled();
      expect(navigated()).toEqual([]);
      expect(lookups).toEqual(['job-1']);
      expect(JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!)).toEqual(workspace);
      expect(workspace.review).toEqual(stored.review);
      expect(workspace.uploadedLogoUrl).toBe(stored.uploadedLogoUrl);
      fireEvent.submit(form);
      await waitFor(() => expect(requests).toHaveLength(3));
      expect(requests[2].variables).toEqual({ requestId: currentId, officialUrl: 'https://notion.so/' });
      const latestJob = { ...requestedRaceJob, id: `request:${currentId}` };
      jobs[latestJob.id] = latestJob;
      requests[2].respond(latestJob);
      await waitFor(() => expect(navigated()).toEqual([`/products/new?researchJobId=request%3A${currentId}`]));
      await act(async () => {
        requests[1].respond(latestJob);
        await nextTurn();
      });
      expect(lookups).toEqual(['job-1', latestJob.id]);
      expect(JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!).jobId).toBe(latestJob.id);
      expect(navigated()).toEqual([`/products/new?researchJobId=request%3A${currentId}`]);
    }
  );

  it('B 대기 중 이미 시작한 A 조회의 부재 응답도 새 등록의 review와 이동을 끝내지 않는다', async () => {
    const { stored, requests, materializations, lookups, jobs } = await renderCompletedResearch();
    submitResearchRequest('https://notion.so/');
    await waitFor(() => expect(requests).toHaveLength(1));
    const lookup = Promise.withResolvers<unknown>();
    jobs['job-1'] = lookup.promise;
    fireEvent.click(screen.getByRole('button', { name: '결과 새로고침' }));
    await waitFor(() => expect(lookups).toEqual(['job-1', 'job-1']));
    fireEvent.click(screen.getByRole('button', { name: '검토 내용으로 미발행 생성' }));
    await waitFor(() => expect(materializations).toHaveLength(1));
    await act(async () => {
      lookup.resolve(null);
      requests[0].respond();
      await nextTurn();
    });
    expect(screen.queryByText(/조사 작업을 찾을 수 없습니다/)).toBeNull();
    expect(screen.getByText(/작업 ID: job-1 · 상태: completed/)).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(navigated()).toEqual([]);
    expect(notifications.show).not.toHaveBeenCalled();
    expect(JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!).review).toEqual(stored.review);
    materializations[0].respond({ id: 'prod-a', slug: 'a-after-stale-lookup', name: '현재 A' });
    await waitFor(() => expect(navigated()).toEqual(['/products/a-after-stale-lookup']));
    expect(lookups).toEqual(['job-1', 'job-1']);
  });
});

describe('review registration releases superseded lookup busy with real Apollo', () => {
  const staleOutcomes = ['null', 'success', 'network', 'GraphQL'] as const;
  const staleJob = { ...failedRaceJob, errorMessage: '후착 조회가 덮어쓰면 안 되는 실패' };

  function finishLookup(call: RaceLookupCall, outcome: (typeof staleOutcomes)[number]) {
    if (outcome === 'null') call.respond(null);
    else if (outcome === 'success') call.respond(staleJob);
    else
      call.fail(
        outcome === 'GraphQL' ? new GraphQLError('이전 조회 GraphQL 실패') : new Error('이전 조회 network 실패')
      );
  }

  const lookupOrderCases = staleOutcomes.flatMap(outcome => [
    { outcome, lookupFirst: true },
    { outcome, lookupFirst: false },
  ]);

  it.each(lookupOrderCases)(
    '이전 조회 $outcome 선착=$lookupFirst: 등록 실패 후 다시 조회·재제출한다',
    async ({ outcome, lookupFirst }) => {
      const lookupCalls: RaceLookupCall[] = [];
      const { stored, materializations, lookups, requests, retries } = await renderCompletedResearch(
        undefined,
        lookupCalls
      );
      fireEvent.click(screen.getByRole('button', { name: '결과 새로고침' }));
      await waitFor(() => expect(lookupCalls).toHaveLength(2));
      expect((screen.getByRole('button', { name: '새로고침 중...' }) as HTMLButtonElement).disabled).toBe(true);
      const submit = screen.getByRole('button', { name: '검토 내용으로 미발행 생성' }) as HTMLButtonElement;
      expect(submit.disabled).toBe(false);
      fireEvent.click(submit);
      // 성공 이동이 아니라 등록 시작 자체가 대체한 조회의 busy를 종료해야 한다.
      expect((screen.getByRole('button', { name: '결과 새로고침' }) as HTMLButtonElement).disabled).toBe(false);
      await waitFor(() => expect(materializations).toHaveLength(1));
      const workspace = JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!);
      if (lookupFirst) {
        await act(async () => {
          finishLookup(lookupCalls[1], outcome);
          await nextTurn();
        });
        expect((screen.getByRole('button', { name: '생성 중...' }) as HTMLButtonElement).disabled).toBe(true);
        expect(screen.queryByRole('alert')).toBeNull();
      }
      const failure = lookupFirst ? new Error('현재 등록 network 실패') : new GraphQLError('현재 등록 GraphQL 실패');
      materializations[0].fail(failure);
      expect((await screen.findByRole('alert')).textContent).toContain(failure.message);
      if (!lookupFirst) {
        await act(async () => {
          finishLookup(lookupCalls[1], outcome);
          await nextTurn();
        });
      }
      expect(screen.getByRole('alert').textContent).toContain(failure.message);
      expect(screen.queryByText(/조사 작업을 찾을 수 없습니다/)).toBeNull();
      expect(screen.getByText(/작업 ID: job-1 · 상태: completed/)).toBeTruthy();
      expect(screen.getByText('조사 요약')).toBeTruthy();
      expect(screen.getByRole('link', { name: 'Linear' }).getAttribute('href')).toBe('https://linear.app/');
      expect((document.querySelector('[name="review-name"]') as HTMLInputElement).value).toBe(stored.review.name);
      expect((document.querySelector('[name="review-slug"]') as HTMLInputElement).value).toBe(stored.review.slug);
      expect((document.querySelector('[name="review-logo-url"]') as HTMLInputElement).value).toBe(
        stored.review.logoUrl
      );
      expect((document.querySelector('[name="officialUrl"]') as HTMLInputElement).value).toBe(stored.officialUrl);
      expect(JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!)).toEqual(workspace);
      expect(JSON.parse(readSavedWorkspace(`${RESEARCH_WORKSPACE_STORAGE_KEY}:job-1`)!)).toEqual(workspace);
      expect(navigated()).toEqual([]);
      expect(notifications.show).not.toHaveBeenCalled();
      const refresh = screen.getByRole('button', { name: '결과 새로고침' }) as HTMLButtonElement;
      expect(refresh.disabled).toBe(false);
      fireEvent.click(refresh);
      await waitFor(() => expect(lookupCalls).toHaveLength(3));
      expect((screen.getByRole('button', { name: '새로고침 중...' }) as HTMLButtonElement).disabled).toBe(true);
      lookupCalls[2].respond(completedJob);
      await waitFor(() =>
        expect((screen.getByRole('button', { name: '결과 새로고침' }) as HTMLButtonElement).disabled).toBe(false)
      );
      // 조회는 현재 등록 실패를 지우지 않는다. 명시 재제출만 새 action을 획득한다.
      expect(screen.getByRole('alert').textContent).toContain(failure.message);
      expect(JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!)).toEqual(workspace);
      fireEvent.click(screen.getByRole('button', { name: '검토 내용으로 미발행 생성' }));
      await waitFor(() => expect(materializations).toHaveLength(2));
      expect(materializations[1].variables).toEqual(materializations[0].variables);
      expect(screen.queryByRole('alert')).toBeNull();
      await act(async () => {
        materializations[1].respond({ id: 'prod-existing-a', slug: 'server-current-a', name: '현재 서버 제품' });
        await nextTurn();
      });
      await waitFor(() => expect(navigated()).toEqual(['/products/server-current-a']));
      expect(JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!).materializedSlug).toBe('server-current-a');
      expect(notifications.show).toHaveBeenCalledTimes(1);
      expect(lookups).toEqual(['job-1', 'job-1', 'job-1']);
      expect(requests).toHaveLength(0);
      expect(retries).toHaveLength(0);
      expect(fetch).not.toHaveBeenCalled();
    }
  );

  it.each(staleOutcomes)('이전 조회 %s의 promise 후처리는 이후 시작한 조회의 대기를 해제하지 않는다', async outcome => {
    const lookupCalls: RaceLookupCall[] = [];
    const { materializations, lookups } = await renderCompletedResearch(undefined, lookupCalls);
    fireEvent.click(screen.getByRole('button', { name: '결과 새로고침' }));
    await waitFor(() => expect(lookupCalls).toHaveLength(2));
    fireEvent.click(screen.getByRole('button', { name: '검토 내용으로 미발행 생성' }));
    await waitFor(() => expect(materializations).toHaveLength(1));
    materializations[0].fail(new Error('현재 등록 실패 후 재조회'));
    await screen.findByRole('alert');
    const workspace = JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!);
    await act(async () => {
      // HTTP 응답은 완료해 Apollo 기본 dedupe를 끝내고, 이전 loadJob promise가
      // 재개되기 전에 다음 수동 조회를 시작한다. hook이나 fence는 대체하지 않는다.
      finishLookup(lookupCalls[1], outcome);
      fireEvent.click(screen.getByRole('button', { name: '결과 새로고침' }));
      await nextTurn();
    });
    expect(lookupCalls).toHaveLength(3);
    expect((screen.getByRole('button', { name: '새로고침 중...' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('alert').textContent).toContain('현재 등록 실패 후 재조회');
    expect(screen.queryByText(/조사 작업을 찾을 수 없습니다/)).toBeNull();
    expect(screen.getByText(/작업 ID: job-1 · 상태: completed/)).toBeTruthy();
    expect(JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!)).toEqual(workspace);
    expect(navigated()).toEqual([]);
    expect(notifications.show).not.toHaveBeenCalled();
    lookupCalls[2].respond(null);
    await screen.findByText(/조사 작업을 찾을 수 없습니다/);
    expect((screen.getByRole('button', { name: '결과 새로고침' }) as HTMLButtonElement).disabled).toBe(false);
    expect(JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!)).toEqual(workspace);
    fireEvent.click(screen.getByRole('button', { name: '결과 새로고침' }));
    await waitFor(() => expect(lookupCalls).toHaveLength(4));
    lookupCalls[3].respond(completedJob);
    await screen.findByText(/작업 ID: job-1 · 상태: completed/);
    expect(screen.queryByText(/조사 작업을 찾을 수 없습니다/)).toBeNull();
    expect((screen.getByRole('button', { name: '결과 새로고침' }) as HTMLButtonElement).disabled).toBe(false);
    expect((document.querySelector('[name="review-name"]') as HTMLInputElement).value).toBe(workspace.review.name);
    expect(lookups).toEqual(['job-1', 'job-1', 'job-1', 'job-1']);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(['missing', 'upload failure'])(
    '로고 %s 조기 종료도 대체된 조회를 기다리지 않고 새로고침을 복구한다',
    async logoOutcome => {
      const lookupCalls: RaceLookupCall[] = [];
      const upload = Promise.withResolvers<never>();
      const { stored, materializations, lookups } = await renderCompletedResearch(
        logoOutcome === 'upload failure' ? new File(['logo-a'], 'lookup-a.png', { type: 'image/png' }) : undefined,
        lookupCalls
      );
      if (logoOutcome === 'missing') {
        fireEvent.click(screen.getByRole('button', { name: '로고 선택 취소' }));
        fireEvent.change(document.querySelector('[name="review-logo-url"]')!, { target: { value: '' } });
      } else {
        vi.stubGlobal(
          'fetch',
          vi.fn(() => upload.promise)
        );
      }
      fireEvent.click(screen.getByRole('button', { name: '결과 새로고침' }));
      await waitFor(() => expect(lookupCalls).toHaveLength(2));
      const workspace = JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!);
      fireEvent.click(screen.getByRole('button', { name: '검토 내용으로 미발행 생성' }));
      expect((screen.getByRole('button', { name: '결과 새로고침' }) as HTMLButtonElement).disabled).toBe(false);
      if (logoOutcome === 'upload failure') {
        await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
        expect((screen.getByRole('button', { name: '생성 중...' }) as HTMLButtonElement).disabled).toBe(true);
        expect(screen.getByText('lookup-a.png')).toBeTruthy();
        await act(async () => {
          lookupCalls[1].fail(new GraphQLError('업로드 대기 중 이전 조회 실패'));
          await nextTurn();
        });
        expect(screen.queryByRole('alert')).toBeNull();
        expect(notifications.show).not.toHaveBeenCalled();
        expect((screen.getByRole('button', { name: '생성 중...' }) as HTMLButtonElement).disabled).toBe(true);
        await act(async () => upload.reject(new Error('합성 업로드 실패')));
        expect(notifications.show).toHaveBeenCalledWith({
          message: '로고 업로드에 실패했습니다. 다시 시도해주세요.',
          color: 'red',
        });
      } else {
        await act(async () => {
          lookupCalls[1].respond(null);
          await nextTurn();
        });
        expect(fetch).not.toHaveBeenCalled();
      }
      expect(notifications.show).toHaveBeenCalledWith({
        message: '로고 파일을 올리거나 로고 URL을 직접 입력해주세요.',
        color: 'red',
      });
      expect((screen.getByRole('button', { name: '검토 내용으로 미발행 생성' }) as HTMLButtonElement).disabled).toBe(
        false
      );
      expect((screen.getByRole('button', { name: '결과 새로고침' }) as HTMLButtonElement).disabled).toBe(false);
      expect(screen.getByText(/작업 ID: job-1 · 상태: completed/)).toBeTruthy();
      expect(screen.queryByRole('alert')).toBeNull();
      expect(screen.queryByText(/조사 작업을 찾을 수 없습니다/)).toBeNull();
      expect((document.querySelector('[name="review-name"]') as HTMLInputElement).value).toBe(stored.review.name);
      expect(JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!)).toEqual(workspace);
      expect(JSON.parse(readSavedWorkspace(`${RESEARCH_WORKSPACE_STORAGE_KEY}:job-1`)!)).toEqual(workspace);
      expect(materializations).toHaveLength(0);
      expect(navigated()).toEqual([]);
      const notificationCount = vi.mocked(notifications.show).mock.calls.length;
      fireEvent.click(screen.getByRole('button', { name: '결과 새로고침' }));
      await waitFor(() => expect(lookupCalls).toHaveLength(3));
      expect((screen.getByRole('button', { name: '새로고침 중...' }) as HTMLButtonElement).disabled).toBe(true);
      lookupCalls[2].respond(completedJob);
      await waitFor(() =>
        expect((screen.getByRole('button', { name: '결과 새로고침' }) as HTMLButtonElement).disabled).toBe(false)
      );
      expect(JSON.parse(readSavedWorkspace(RESEARCH_WORKSPACE_STORAGE_KEY)!)).toEqual(workspace);
      expect(notifications.show).toHaveBeenCalledTimes(notificationCount);
      expect(lookups).toEqual(['job-1', 'job-1', 'job-1']);
    }
  );
});
