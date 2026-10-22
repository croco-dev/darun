import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { notifications } from '@mantine/notifications';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GenerateProductDescriptionButton } from '../GenerateProductDescriptionButton';

vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn(), hide: vi.fn() } }));

interface Request {
  name: string;
  variables: Record<string, unknown>;
  resolve: (data: Record<string, unknown>) => void;
  reject: (message: string) => void;
  graphQLError: (message: string, code?: string) => void;
  unsubscribed: boolean;
}

interface Fixture {
  unmount: () => void;
  remount: (address: string) => void;
  jobChanges: string[];
  take: (name: string, id?: string) => Request;
  count: (name: string, id?: string) => number;
}

function job(id: string, status = 'completed', productId = 'product-1') {
  return {
    __typename: 'ProductDescriptionJob' as const,
    id,
    productId,
    status,
    message: status === 'failed' ? '합성 생성 실패' : null,
    error: status === 'failed' ? '합성 생성 실패' : null,
    candidateHtml: status === 'completed' ? `<h2>${id} 저장된 소개</h2><p>사람이 검토할 본문</p>` : null,
    appliedAt: null,
  };
}

function lookup(id: string, status = 'completed') {
  return {
    tempProductBySlug: { __typename: 'Product', id: 'product-1' },
    productDescriptionJob: job(id, status),
  };
}

function generation(id: string, status = 'pending') {
  return {
    generateProductDescription: {
      __typename: 'GenerateProductDescriptionPayload',
      product: { __typename: 'Product', id: 'product-1', name: '합성 제품', description: '<p>사람의 소개</p>' },
      job: job(id, status),
    },
  };
}

function application(id: string, alreadyApplied = false, status = 'completed') {
  return {
    applyProductDescriptionCandidate: {
      __typename: 'ApplyProductDescriptionCandidatePayload',
      alreadyApplied,
      product: {
        __typename: 'Product',
        id: 'product-1',
        name: '합성 제품',
        description: alreadyApplied ? '<p>이후 사람 편집</p>' : `<p>${id} 적용된 소개</p>`,
      },
      job: { ...job(id, status), appliedAt: status === 'completed' ? '2026-10-16T00:00:00.000Z' : null },
    },
  };
}

const applyEndings = ['success', 'alreadyApplied', 'stale', 'network', 'graphql', 'failed'] as const;
type ApplyEnding = (typeof applyEndings)[number];
function finishApply(request: Request, ending: ApplyEnding, id = 'A') {
  switch (ending) {
    case 'success':
      request.resolve(application(id));
      break;
    case 'alreadyApplied':
      request.resolve(application(id, true));
      break;
    case 'stale':
      request.graphQLError('합성 근거 변경', 'STALE_CANDIDATE');
      break;
    case 'network':
      request.reject('합성 Apply 네트워크 오류');
      break;
    case 'graphql':
      request.graphQLError('합성 Apply GraphQL 오류', 'INTERNAL_SERVER_ERROR');
      break;
    case 'failed':
      request.resolve(application(id, false, 'failed'));
      break;
  }
}

// Keep the shared component mounted as a Next.js query/slug prop update would.
// onJobChange changes both the address and the actual descriptionJobId prop.
function Route({ onJobChange }: { onJobChange: (id: string) => void }) {
  const [address, setAddress] = useState(() => window.location.pathname + window.location.search);
  useEffect(() => {
    const updateAddress = () => setAddress(window.location.pathname + window.location.search);
    window.addEventListener('popstate', updateAddress);
    return () => window.removeEventListener('popstate', updateAddress);
  }, []);
  const url = new URL(address, window.location.origin);
  return (
    <GenerateProductDescriptionButton
      slug={url.pathname.split('/').slice(-1)[0] as string}
      descriptionJobId={url.searchParams.get('descriptionJobId') ?? undefined}
      onJobChange={id => {
        onJobChange(id);
        url.searchParams.set('descriptionJobId', id);
        window.history.replaceState(null, '', url.pathname + url.search);
        setAddress(url.pathname + url.search);
      }}
    />
  );
}

const clients: ApolloClient[] = [];
function setup(address = '/products/sample?descriptionJobId=A'): Fixture {
  window.history.replaceState(null, '', address);
  const requests: Request[] = [];
  const log: Request[] = [];
  const jobChanges: string[] = [];
  const link = new ApolloLink(
    operation =>
      new Observable(observer => {
        const request = {
          name: operation.operationName ?? 'unknown',
          variables: operation.variables as Record<string, unknown>,
          resolve: (data: Record<string, unknown>) => {
            observer.next({ data });
            observer.complete();
          },
          reject: (message: string) => observer.error(new Error(message)),
          graphQLError: (message: string, code?: string) => {
            observer.next({ errors: [{ message, extensions: code ? { code } : undefined }] });
            observer.complete();
          },
          unsubscribed: false,
        };
        requests.push(request);
        log.push(request);
        return () => {
          request.unsubscribed = true;
        };
      })
  );
  const client = new ApolloClient({ cache: new InMemoryCache(), link });
  clients.push(client);
  const mount = () =>
    render(
      <ApolloProvider client={client}>
        <Route onJobChange={id => jobChanges.push(id)} />
      </ApolloProvider>
    );
  let view = mount();
  return {
    unmount: () => view.unmount(),
    remount(address: string) {
      window.history.replaceState(null, '', address);
      view = mount();
    },
    jobChanges,
    take(name: string, id?: string) {
      const index = requests.findIndex(
        request => request.name === name && (!id || request.variables.id === id || request.variables.jobId === id)
      );
      expect(index, `${name} ${id ?? ''} request`).toBeGreaterThanOrEqual(0);
      return requests.splice(index, 1)[0]!;
    },
    count(name: string, id?: string) {
      return log.filter(request => request.name === name && (!id || request.variables.id === id)).length;
    },
  };
}

async function flush(action: () => void = () => {}) {
  await act(async () => {
    action();
    await Promise.resolve();
  });
}
async function advance(ms = 2000) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}
async function navigate(address: string) {
  await flush(() => {
    window.history.pushState(null, '', address);
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
}
const input = () => screen.getByRole<HTMLInputElement>('textbox', { name: '후보 작업 ID로 다시 열기' });
const reopen = () => screen.getByRole<HTMLButtonElement>('button', { name: '후보 다시 열기' });
const generating = () => screen.getByRole<HTMLButtonElement>('button', { name: 'AI 소개 생성' });
const notices = () => vi.mocked(notifications.show).mock.calls.map(([notice]) => notice);
async function submitId(id: string) {
  expect(input().disabled).toBe(false);
  await flush(() => fireEvent.change(input(), { target: { value: id } }));
  await flush(() => fireEvent.submit(input().closest('form')!));
}
async function closePreview() {
  await flush(() =>
    fireEvent.click(
      within(screen.getByRole('dialog')).getAllByRole('button', { name: '닫기', hidden: true })[0] as HTMLElement
    )
  );
}

const applyingButton = (pending = false) =>
  within(screen.getByRole('dialog')).getAllByRole<HTMLButtonElement>('button', {
    name: pending ? '적용 중...' : '적용하기',
    hidden: true,
  })[0]!;
async function startApply(fixture: Fixture, id: string) {
  expect(applyingButton().disabled).toBe(false);
  await flush(() => fireEvent.click(applyingButton()));
  const request = fixture.take('ApplyProductDescriptionCandidate', id);
  expect(request.variables).toEqual({ jobId: id });
  expect(applyingButton(true).disabled).toBe(true);
  return request;
}
function expectCandidate(id: string, pending = false) {
  const preview = within(screen.getByRole('dialog'));
  expect(preview.getByText(`후보 작업 ID: ${id}`)).toBeTruthy();
  expect(preview.getByRole('heading', { name: `${id} 저장된 소개` }).parentElement?.innerHTML).toBe(
    `<h2>${id} 저장된 소개</h2><p>사람이 검토할 본문</p>`
  );
  expect(applyingButton(pending).disabled).toBe(pending);
  expect(screen.queryByRole('alert')).toBeNull();
}

async function finishGenerationAtOwnAddress(fixture: Fixture, ending: 'completed' | 'failed' | 'timeout') {
  await flush(() => fireEvent.click(generating()));
  await flush(() => fixture.take('GenerateProductDescription').resolve(generation('B')));
  expect(window.location.pathname + window.location.search).toBe('/products/sample?descriptionJobId=B');
  expect(fixture.jobChanges).toEqual(['B']);
  expect(input().value).toBe('B');
  expect(input().disabled).toBe(true);
  await advance();
  expect(fixture.count('GetProductDescriptionJob', 'B')).toBe(1);
  const poll = fixture.take('GetProductDescriptionJob', 'B');
  if (ending === 'timeout') {
    await advance(180_001);
    await flush(() => poll.resolve(lookup('B', 'in_progress')));
    await advance();
    expect(notices()).toContainEqual(expect.objectContaining({ title: '화면 대기 종료' }));
    expect(notices().some(notice => notice.title === '생성 실패')).toBe(false);
  } else {
    await flush(() => poll.resolve(lookup('B', ending)));
    if (ending === 'completed') {
      expectCandidate('B');
      await closePreview();
    } else {
      expect(notices()).toContainEqual(expect.objectContaining({ title: '생성 실패', message: '합성 생성 실패' }));
    }
  }
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(input().disabled).toBe(false);
  expect(reopen().disabled).toBe(false);
  expect(generating().disabled).toBe(false);
}

// No hook, Apollo hook, component, cache policy, or state decision is mocked.
// Only the network link and notification sink are controlled.
describe('candidate reopen authority through the shared component and real Apollo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });
  afterEach(() => {
    cleanup();
    clients.splice(0).forEach(client => client.stop());
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it.each(['completed', 'failed'])(
    'releases resumed A after generation B %s and reopens stored HTML manually',
    async status => {
      const fixture = setup();
      await flush(() => fixture.take('GetProductDescriptionJob', 'A').resolve(lookup('A', 'pending')));
      expect(input().disabled).toBe(true);
      expect(generating().disabled).toBe(false); // Do not hide the race by blocking generation.
      await flush(() => fireEvent.click(generating()));
      await flush(() => fixture.take('GenerateProductDescription').resolve(generation('B')));
      expect(new URL(window.location.href).searchParams.get('descriptionJobId')).toBe('B');
      expect(input().disabled).toBe(true);
      expect(reopen().disabled).toBe(true);
      await advance(); // Old A's poll loop and B's first poll become runnable together.
      await flush(() => fixture.take('GetProductDescriptionJob', 'B').resolve(lookup('B', status)));
      if (status === 'completed') {
        expect(screen.getByRole('heading', { name: 'B 저장된 소개' })).toBeTruthy();
        await closePreview();
      } else {
        expect(notices()).toContainEqual(expect.objectContaining({ title: '생성 실패', message: '합성 생성 실패' }));
        expect(screen.queryByRole('dialog')).toBeNull();
      }
      expect(input().value).toBe('B');
      expect(input().disabled).toBe(false);
      expect(reopen().disabled).toBe(false);
      await submitId('stored-v1');
      const stored = lookup('stored-v1');
      stored.productDescriptionJob.candidateHtml = '<h2>과거 HTML</h2><ul><li>원래 항목</li></ul>';
      await flush(() => fixture.take('GetProductDescriptionJob', 'stored-v1').resolve(stored));
      // onJobChange also performs the ordinary deep-link lookup after manual reopening.
      await flush(() => fixture.take('GetProductDescriptionJob', 'stored-v1').resolve(stored));
      expect(screen.getByRole('heading', { name: '과거 HTML' })).toBeTruthy();
      expect(screen.getByRole('listitem').textContent).toBe('원래 항목');
      expect(input().disabled).toBe(false);
      expect(reopen().disabled).toBe(false);
    }
  );

  it('ends B screen waiting and permits manual recovery without reporting job failure', async () => {
    const fixture = setup();
    await flush(() => fixture.take('GetProductDescriptionJob', 'A').resolve(lookup('A', 'pending')));
    await flush(() => fireEvent.click(generating()));
    await flush(() => fixture.take('GenerateProductDescription').resolve(generation('B')));
    await advance();
    const poll = fixture.take('GetProductDescriptionJob', 'B');
    await advance(180_001);
    await flush(() => poll.resolve(lookup('B', 'in_progress')));
    await advance();
    expect(notices()).toContainEqual(expect.objectContaining({ title: '화면 대기 종료', color: 'blue' }));
    expect(notices().some(notice => notice.title === '생성 실패')).toBe(false);
    expect(input().disabled).toBe(false);
    expect(reopen().disabled).toBe(false);
    await submitId('B');
    await flush(() => fixture.take('GetProductDescriptionJob', 'B').resolve(lookup('B')));
    expect(screen.getByRole('heading', { name: 'B 저장된 소개' })).toBeTruthy();
  });

  describe.each(['completed', 'failed', 'timeout'] as const)(
    'after self-addressed B generation %s',
    generationEnding => {
      it.each(['success', 'network', 'graphql'] as const)(
        'revokes manual B lookup on actual unmount abort before late %s and same-address remount',
        async ending => {
          const fixture = setup('/products/sample');
          await finishGenerationAtOwnAddress(fixture, generationEnding);
          await submitId('B');
          const departed = fixture.take('GetProductDescriptionJob', 'B');
          expect(departed.unsubscribed).toBe(false);
          expect(input().disabled).toBe(true);
          const before = notices().length;
          const hiddenBefore = vi.mocked(notifications.hide).mock.calls.length;
          await flush(() => {
            // Do not dispatch a prop/route change: B's self-address effect returned without cleanup.
            fixture.unmount();
            window.history.replaceState(null, '', '/settings');
          });
          expect(departed.unsubscribed).toBe(true); // Real Apollo tears down and aborts the pending lazy query.
          expect(window.location.pathname + window.location.search).toBe('/settings');
          expect(screen.queryByRole('dialog')).toBeNull();
          expect(notices()).toHaveLength(before);
          expect(fixture.jobChanges).toEqual(['B']);
          expect(fixture.count('GetProductDescriptionJob')).toBe(2);

          await flush(() => fixture.remount('/products/sample?descriptionJobId=B'));
          const current = fixture.take('GetProductDescriptionJob', 'B');
          expect(current.unsubscribed).toBe(false);
          const late = lookup('B');
          late.productDescriptionJob.candidateHtml = '<h2>떠난 화면의 수동 후보</h2>';
          await flush(() => {
            if (ending === 'success') departed.resolve(late);
            else if (ending === 'network') departed.reject('떠난 화면의 network 오류');
            else departed.graphQLError('떠난 화면의 GraphQL 오류', 'INTERNAL_SERVER_ERROR');
          });
          await advance();
          expect(window.location.pathname + window.location.search).toBe('/products/sample?descriptionJobId=B');
          expect(input().value).toBe('B');
          expect(input().disabled).toBe(true);
          expect(screen.getByRole<HTMLButtonElement>('button', { name: '여는 중...' }).disabled).toBe(true);
          expect(generating().disabled).toBe(false);
          expect(screen.queryByRole('dialog')).toBeNull();
          expect(screen.queryByRole('alert')).toBeNull();
          expect(notices()).toHaveLength(before);
          expect(vi.mocked(notifications.hide).mock.calls).toHaveLength(hiddenBefore);
          expect(fixture.jobChanges).toEqual(['B']);
          expect(fixture.count('GetProductDescriptionJob')).toBe(3); // No departed follow-up or navigation lookup.
          expect(fixture.count('GenerateProductDescription')).toBe(1);
          expect(fixture.count('ApplyProductDescriptionCandidate')).toBe(0);
          await flush(() => current.resolve(lookup('B')));
          expectCandidate('B');
          expect(screen.queryByRole('heading', { name: '떠난 화면의 수동 후보' })).toBeNull();
          await closePreview();
          await flush(() => fireEvent.change(input(), { target: { value: '재방문 입력 유지' } }));
          expect(input().value).toBe('재방문 입력 유지');
          expect(input().disabled).toBe(false);
          expect(reopen().disabled).toBe(false);
        }
      );
    }
  );

  it.each(['network', 'graphql'] as const)(
    'preserves current manual input after self-addressed B and %s failure, then retries stored HTML',
    async ending => {
      const fixture = setup('/products/sample');
      await finishGenerationAtOwnAddress(fixture, 'failed');
      await submitId('B');
      const request = fixture.take('GetProductDescriptionJob', 'B');
      const message = `현재 수동 조회 ${ending} 오류`;
      await flush(() => (ending === 'network' ? request.reject(message) : request.graphQLError(message)));
      expect(notices()).toContainEqual(
        expect.objectContaining({ title: '후보 다시 열기 실패', message, color: 'red' })
      );
      expect(input().value).toBe('B');
      expect(input().disabled).toBe(false);
      expect(reopen().disabled).toBe(false);
      expect(screen.queryByRole('dialog')).toBeNull();
      await submitId('B');
      await flush(() => fixture.take('GetProductDescriptionJob', 'B').resolve(lookup('B')));
      expectCandidate('B');
      expect(fixture.jobChanges).toEqual(['B', 'B']);
      expect(input().value).toBe('B');
      expect(input().disabled).toBe(false);
      expect(reopen().disabled).toBe(false);
      expect(fixture.count('GetProductDescriptionJob')).toBe(3);
    }
  );

  it('preserves the entered ID after a query error and recovers through the existing form', async () => {
    const fixture = setup();
    await flush(() => fixture.take('GetProductDescriptionJob', 'A').reject('합성 조회 오류'));
    expect(input().value).toBe('A');
    expect(input().disabled).toBe(false);
    expect(reopen().disabled).toBe(false);
    expect(notices()).toContainEqual(
      expect.objectContaining({ title: '후보 다시 열기 실패', message: '합성 조회 오류' })
    );
    await submitId('A');
    await flush(() => fixture.take('GetProductDescriptionJob', 'A').resolve(lookup('A')));
    expect(screen.getByRole('heading', { name: 'A 저장된 소개' })).toBeTruthy();
    expect(input().value).toBe('A');
  });

  it.each(['resolve', 'reject'] as const)(
    'clears busy on ID removal and ignores late A %s while preserving manual input',
    async ending => {
      const fixture = setup();
      const late = fixture.take('GetProductDescriptionJob', 'A');
      await navigate('/products/sample');
      expect(input().disabled).toBe(false);
      await flush(() => fireEvent.change(input(), { target: { value: 'manual-kept' } }));
      const before = notices().length;
      await flush(() => (ending === 'resolve' ? late.resolve(lookup('A')) : late.reject('늦은 A 오류')));
      expect(input().value).toBe('manual-kept');
      expect(input().disabled).toBe(false);
      expect(reopen().disabled).toBe(false);
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(notices()).toHaveLength(before);
      await submitId('manual-kept');
      await flush(() => fixture.take('GetProductDescriptionJob', 'manual-kept').resolve(lookup('manual-kept')));
      await flush(() => fixture.take('GetProductDescriptionJob', 'manual-kept').resolve(lookup('manual-kept')));
      expect(screen.getByRole('heading', { name: 'manual-kept 저장된 소개' })).toBeTruthy();
    }
  );

  it.each(['resolve', 'reject'] as const)(
    'does not let superseded A %s/finally release a newer C query',
    async ending => {
      const fixture = setup();
      const late = fixture.take('GetProductDescriptionJob', 'A');
      await navigate('/products/sample?descriptionJobId=C');
      const current = fixture.take('GetProductDescriptionJob', 'C');
      const before = notices().length;
      await flush(() => (ending === 'resolve' ? late.resolve(lookup('A')) : late.reject('늦은 A 오류')));
      expect(input().value).toBe('C');
      expect(input().disabled).toBe(true);
      expect(screen.getByRole<HTMLButtonElement>('button', { name: '여는 중...' }).disabled).toBe(true);
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(notices()).toHaveLength(before);
      await flush(() => current.resolve(lookup('C')));
      expect(screen.getByRole('heading', { name: 'C 저장된 소개' })).toBeTruthy();
      expect(input().disabled).toBe(false);
    }
  );

  it('does not let a sleeping old poll finally clear a newer query and clears busy on a slug change', async () => {
    const fixture = setup();
    await flush(() => fixture.take('GetProductDescriptionJob', 'A').resolve(lookup('A', 'pending')));
    await navigate('/products/sample?descriptionJobId=C');
    const current = fixture.take('GetProductDescriptionJob', 'C');
    await advance(); // A exits its old delay and finally while C is still in flight.
    expect(input().value).toBe('C');
    expect(input().disabled).toBe(true);
    await navigate('/products/other');
    expect(input().disabled).toBe(false);
    await flush(() => fireEvent.change(input(), { target: { value: 'other-manual' } }));
    await flush(() => current.resolve(lookup('C')));
    expect(input().value).toBe('other-manual');
    expect(input().disabled).toBe(false);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(notices()).toHaveLength(0);
  });

  it.each(['resolve', 'reject'] as const)('ignores in-flight resumed A %s after B owns the address', async ending => {
    const fixture = setup();
    const late = fixture.take('GetProductDescriptionJob', 'A');
    await flush(() => fireEvent.click(generating()));
    await flush(() => fixture.take('GenerateProductDescription').resolve(generation('B')));
    expect(new URL(window.location.href).searchParams.get('descriptionJobId')).toBe('B');
    const before = notices().length;
    await flush(() => (ending === 'resolve' ? late.resolve(lookup('A')) : late.reject('늦은 A 오류')));
    expect(input().value).toBe('B');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(notices()).toHaveLength(before);
    await advance();
    await flush(() => fixture.take('GetProductDescriptionJob', 'B').resolve(lookup('B')));
    expect(screen.getByRole('heading', { name: 'B 저장된 소개' })).toBeTruthy();
    await closePreview();
    expect(input().disabled).toBe(false);
    expect(reopen().disabled).toBe(false);
  });

  it.each(['resolve', 'reject'] as const)(
    'invalidates manual reopen %s when generation takes over without a route ID',
    async ending => {
      const fixture = setup('/products/sample');
      await submitId('manual-A');
      const late = fixture.take('GetProductDescriptionJob', 'manual-A');
      expect(generating().disabled).toBe(false);
      await flush(() => fireEvent.click(generating()));
      await flush(() => fixture.take('GenerateProductDescription').resolve(generation('B', 'completed')));
      const before = notices().length;
      await flush(() => (ending === 'resolve' ? late.resolve(lookup('manual-A')) : late.reject('늦은 수동 조회 오류')));
      expect(screen.getByRole('heading', { name: 'B 저장된 소개' })).toBeTruthy();
      expect(screen.queryByRole('heading', { name: 'manual-A 저장된 소개' })).toBeNull();
      expect(notices()).toHaveLength(before);
      await closePreview();
      expect(input().disabled).toBe(false);
      expect(reopen().disabled).toBe(false);
    }
  );

  it('revokes generation B, reopens external C, and applies the stored C candidate', async () => {
    const fixture = setup();
    await flush(() => fixture.take('GetProductDescriptionJob', 'A').resolve(lookup('A', 'pending')));
    await flush(() => fireEvent.click(generating()));
    await flush(() => fixture.take('GenerateProductDescription').resolve(generation('B')));
    expect(new URL(window.location.href).searchParams.get('descriptionJobId')).toBe('B');
    expect(input().value).toBe('B');
    await advance(); // B's first poll is now in flight.
    const latePoll = fixture.take('GetProductDescriptionJob', 'B');
    // An external C choice replaces the address the generation itself reported.
    await navigate('/products/sample?descriptionJobId=C');
    const current = fixture.take('GetProductDescriptionJob', 'C');
    expect(input().value).toBe('C');
    expect(input().disabled).toBe(true);
    const before = notices().length;
    await flush(() => latePoll.resolve(lookup('B')));
    expect(input().value).toBe('C');
    expect(input().disabled).toBe(true);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(notices()).toHaveLength(before);
    expect(generating().disabled).toBe(false);
    expect(fixture.count('GetProductDescriptionJob', 'B')).toBe(1); // No second B poll after revocation.
    await flush(() => current.resolve(lookup('C')));
    expect(screen.getByRole('heading', { name: 'C 저장된 소개' })).toBeTruthy();
    // The stored C HTML stays the Apply target; the revoked B job is never applied.
    await flush(() =>
      fireEvent.click(
        within(screen.getByRole('dialog')).getAllByRole('button', { name: '적용하기', hidden: true })[0] as HTMLElement
      )
    );
    const apply = fixture.take('ApplyProductDescriptionCandidate');
    expect(apply.variables.jobId).toBe('C');
    await flush(() =>
      apply.resolve({
        applyProductDescriptionCandidate: {
          __typename: 'ApplyProductDescriptionCandidatePayload',
          alreadyApplied: false,
          product: { __typename: 'Product', id: 'product-1', name: '합성 제품', description: '<p>사람의 소개</p>' },
          job: job('C'),
        },
      })
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(notices().some(notice => notice.title === '적용 완료')).toBe(true);
    // The revoked generation hid its own loading notification on hand-over.
    expect(vi.mocked(notifications.hide).mock.calls.some(([id]) => id === 'generating-description-sample')).toBe(true);
  });

  it.each(['/products/sample', '/products/sample?descriptionJobId=A'])(
    'keeps normal generation from %s owning the screen when it reports its own B address',
    async address => {
      const fixture = setup(address);
      if (address.includes('descriptionJobId=A')) {
        await flush(() => fixture.take('GetProductDescriptionJob', 'A').resolve(lookup('A', 'pending')));
      }
      await flush(() => fireEvent.click(generating()));
      await advance();
      expect(window.location.pathname + window.location.search).toBe(address);
      expect(input().disabled).toBe(true);
      expect(screen.getByRole<HTMLButtonElement>('button', { name: 'AI 소개 생성 중...' }).disabled).toBe(true);
      await flush(() => fixture.take('GenerateProductDescription').resolve(generation('B')));
      expect(new URL(window.location.href).searchParams.get('descriptionJobId')).toBe('B');
      expect(input().disabled).toBe(true);
      expect(screen.getByRole<HTMLButtonElement>('button', { name: 'AI 소개 생성 중...' }).disabled).toBe(true);
      expect(notices()).toContainEqual(expect.objectContaining({ title: 'AI 소개 생성 중', loading: true }));
      expect(notifications.hide).not.toHaveBeenCalled();
      // The self-reported address is not an external switch: no duplicate route reopen poll.
      await advance();
      expect(fixture.count('GetProductDescriptionJob', 'B')).toBe(1);
      await flush(() => fixture.take('GetProductDescriptionJob', 'B').resolve(lookup('B', 'in_progress')));
      expect(input().disabled).toBe(true);
      expect(screen.getByRole<HTMLButtonElement>('button', { name: 'AI 소개 생성 중...' }).disabled).toBe(true);
      await advance();
      await flush(() => fixture.take('GetProductDescriptionJob', 'B').resolve(lookup('B')));
      expect(screen.getByRole('heading', { name: 'B 저장된 소개' })).toBeTruthy();
      expect(notices().some(notice => notice.title === '후보 다시 열기 실패')).toBe(false);
      expect(notices().some(notice => notice.title === 'AI 소개 초안 생성 완료')).toBe(true);
      await closePreview();
      expect(input().disabled).toBe(false);
      expect(reopen().disabled).toBe(false);
      expect(generating().disabled).toBe(false);
    }
  );

  it.each(['resolve', 'reject'] as const)(
    'ignores late B %s after an external C switch while the mutation is pending',
    async ending => {
      const fixture = setup('/products/sample');
      await flush(() => fireEvent.click(generating()));
      const pending = fixture.take('GenerateProductDescription');
      await navigate('/products/sample?descriptionJobId=C');
      const current = fixture.take('GetProductDescriptionJob', 'C');
      expect(input().value).toBe('C');
      expect(generating().disabled).toBe(false);
      const before = notices().length;
      await flush(() => (ending === 'resolve' ? pending.resolve(generation('B')) : pending.reject('늦은 B 생성 오류')));
      expect(input().value).toBe('C');
      expect(input().disabled).toBe(true);
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(notices()).toHaveLength(before);
      expect(new URL(window.location.href).searchParams.get('descriptionJobId')).toBe('C');
      await flush(() => current.resolve(lookup('C')));
      expect(screen.getByRole('heading', { name: 'C 저장된 소개' })).toBeTruthy();
      await closePreview();
      expect(input().disabled).toBe(false);
      expect(reopen().disabled).toBe(false);
      expect(generating().disabled).toBe(false);
    }
  );

  it.each(['pending', 'completed', 'failed', 'network', 'graphql', 'deadline'] as const)(
    'revokes B before its mutation %s when the starting A address loses its ID',
    async ending => {
      const fixture = setup();
      await flush(() => fixture.take('GetProductDescriptionJob', 'A').resolve(lookup('A', 'pending')));
      await flush(() => fireEvent.click(generating()));
      const mutation = fixture.take('GenerateProductDescription');
      expect(input().disabled).toBe(true);
      await navigate('/products/sample');
      // Release the screen before the mutation responds, not only after a late result.
      expect(input().disabled).toBe(false);
      expect(reopen().disabled).toBe(false);
      expect(generating().disabled).toBe(false);
      expect(notifications.hide).toHaveBeenCalledWith('generating-description-sample');
      await flush(() => fireEvent.change(input(), { target: { value: 'manual-after-removal' } }));
      const before = notices().length;
      const hiddenBefore = vi.mocked(notifications.hide).mock.calls.length;
      if (ending === 'deadline') {
        await advance(25_001);
        await flush(() => mutation.resolve(generation('B')));
      } else {
        await flush(() => {
          if (ending === 'network') mutation.reject('늦은 B 네트워크 오류');
          else if (ending === 'graphql') mutation.graphQLError('늦은 B GraphQL 오류', 'INTERNAL_SERVER_ERROR');
          else mutation.resolve(generation('B', ending));
        });
      }
      await advance(180_001);
      expect(window.location.pathname + window.location.search).toBe('/products/sample');
      expect(fixture.jobChanges).toEqual([]);
      expect(fixture.count('GetProductDescriptionJob', 'B')).toBe(0);
      expect(input().value).toBe('manual-after-removal');
      expect(input().disabled).toBe(false);
      expect(reopen().disabled).toBe(false);
      expect(generating().disabled).toBe(false);
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(screen.queryByRole('alert')).toBeNull();
      expect(notices()).toHaveLength(before);
      expect(vi.mocked(notifications.hide).mock.calls).toHaveLength(hiddenBefore);
      await submitId('manual-after-removal');
      await flush(() =>
        fixture.take('GetProductDescriptionJob', 'manual-after-removal').resolve(lookup('manual-after-removal'))
      );
      await flush(() =>
        fixture.take('GetProductDescriptionJob', 'manual-after-removal').resolve(lookup('manual-after-removal'))
      );
      expectCandidate('manual-after-removal');
    }
  );

  it('does not restore revoked B when its starting A address is revisited', async () => {
    const fixture = setup();
    await flush(() => fixture.take('GetProductDescriptionJob', 'A').resolve(lookup('A', 'pending')));
    await flush(() => fireEvent.click(generating()));
    const mutation = fixture.take('GenerateProductDescription');
    await navigate('/products/sample');
    expect(generating().disabled).toBe(false);
    await navigate('/products/sample?descriptionJobId=A');
    const current = fixture.take('GetProductDescriptionJob', 'A');
    const before = notices().length;
    await flush(() => mutation.resolve(generation('B')));
    await advance();
    expect(window.location.search).toBe('?descriptionJobId=A');
    expect(fixture.jobChanges).toEqual([]);
    expect(fixture.count('GetProductDescriptionJob', 'B')).toBe(0);
    expect(input().value).toBe('A');
    expect(input().disabled).toBe(true);
    expect(generating().disabled).toBe(false);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(notices()).toHaveLength(before);
    await flush(() => current.resolve(lookup('A')));
    expectCandidate('A');
  });

  it.each(['resolve', 'reject'] as const)(
    'keeps D waiting after starting A ID removal and revoked B mutation %s/finally',
    async ending => {
      const fixture = setup();
      await flush(() => fixture.take('GetProductDescriptionJob', 'A').resolve(lookup('A', 'pending')));
      await flush(() => fireEvent.click(generating()));
      const oldMutation = fixture.take('GenerateProductDescription');
      await navigate('/products/sample');
      expect(generating().disabled).toBe(false);
      await flush(() => fireEvent.change(input(), { target: { value: 'D-wait-input' } }));
      await flush(() => fireEvent.click(generating()));
      const current = fixture.take('GenerateProductDescription');
      const before = notices().length;
      const hiddenBefore = vi.mocked(notifications.hide).mock.calls.length;
      await flush(() =>
        ending === 'resolve'
          ? oldMutation.resolve(generation('B', 'completed'))
          : oldMutation.reject('늦은 B 생성 오류')
      );
      expect(window.location.pathname + window.location.search).toBe('/products/sample');
      expect(fixture.jobChanges).toEqual([]);
      expect(fixture.count('GetProductDescriptionJob', 'B')).toBe(0);
      expect(input().value).toBe('D-wait-input');
      expect(input().disabled).toBe(true);
      expect(reopen().disabled).toBe(true);
      expect(screen.getByRole<HTMLButtonElement>('button', { name: 'AI 소개 생성 중...' }).disabled).toBe(true);
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(notices()).toHaveLength(before);
      expect(vi.mocked(notifications.hide).mock.calls).toHaveLength(hiddenBefore);
      await flush(() => current.resolve(generation('D')));
      expect(window.location.search).toBe('?descriptionJobId=D');
      expect(fixture.jobChanges).toEqual(['D']);
      await advance();
      expect(fixture.count('GetProductDescriptionJob', 'D')).toBe(1);
      await flush(() => fixture.take('GetProductDescriptionJob', 'D').resolve(lookup('D')));
      expectCandidate('D');
      await closePreview();
      expect(input().disabled).toBe(false);
      expect(generating().disabled).toBe(false);
    }
  );

  it.each(['completed', 'failed'] as const)(
    'fences B poll %s arriving while C is awaited and keeps manual recovery',
    async status => {
      const fixture = setup();
      await flush(() => fixture.take('GetProductDescriptionJob', 'A').resolve(lookup('A', 'pending')));
      await flush(() => fireEvent.click(generating()));
      await flush(() => fixture.take('GenerateProductDescription').resolve(generation('B')));
      await advance(); // B's first poll is now in flight.
      const latePoll = fixture.take('GetProductDescriptionJob', 'B');
      await navigate('/products/sample?descriptionJobId=C');
      const current = fixture.take('GetProductDescriptionJob', 'C');
      const before = notices().length;
      await flush(() => latePoll.resolve(lookup('B', status)));
      expect(input().value).toBe('C');
      expect(input().disabled).toBe(true);
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(notices()).toHaveLength(before);
      await flush(() => current.resolve(lookup('C', 'pending')));
      await advance();
      await flush(() => fixture.take('GetProductDescriptionJob', 'C').resolve(lookup('C')));
      expect(screen.getByRole('heading', { name: 'C 저장된 소개' })).toBeTruthy();
      await closePreview();
      expect(input().disabled).toBe(false);
      expect(reopen().disabled).toBe(false);
    }
  );

  it('ends B screen waiting on an external switch and does not report job failure', async () => {
    const fixture = setup('/products/sample');
    await flush(() => fireEvent.click(generating()));
    await flush(() => fixture.take('GenerateProductDescription').resolve(generation('B')));
    await advance(); // B's first poll is now in flight.
    const poll = fixture.take('GetProductDescriptionJob', 'B');
    await navigate('/products/sample?descriptionJobId=C');
    const current = fixture.take('GetProductDescriptionJob', 'C');
    await advance(180_001);
    await flush(() => poll.resolve(lookup('B', 'in_progress')));
    expect(notices().some(notice => notice.title === '생성 실패')).toBe(false);
    expect(notices().some(notice => notice.title === '화면 대기 종료')).toBe(false);
    await flush(() => current.resolve(lookup('C')));
    expect(screen.getByRole('heading', { name: 'C 저장된 소개' })).toBeTruthy();
  });

  it.each(['/products/sample', '/products/other'])(
    'releases busy on navigation to %s during generation without B writes',
    async address => {
      const fixture = setup('/products/sample');
      await flush(() => fireEvent.click(generating()));
      await flush(() => fixture.take('GenerateProductDescription').resolve(generation('B')));
      await advance();
      const inFlight = fixture.take('GetProductDescriptionJob', 'B');
      await navigate(address);
      expect(input().disabled).toBe(false);
      expect(reopen().disabled).toBe(false);
      expect(new URL(window.location.href).searchParams.get('descriptionJobId')).toBe(null);
      await flush(() => fireEvent.change(input(), { target: { value: 'other-manual' } }));
      const before = notices().length;
      await flush(() => inFlight.resolve(lookup('B', 'completed')));
      expect(input().value).toBe('other-manual');
      expect(input().disabled).toBe(false);
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(notices()).toHaveLength(before);
    }
  );

  it('ignores the deadline timeout arriving after an external C switch', async () => {
    const fixture = setup('/products/sample');
    await flush(() => fireEvent.click(generating()));
    fixture.take('GenerateProductDescription'); // Leave the mutation pending.
    await navigate('/products/sample?descriptionJobId=C');
    const current = fixture.take('GetProductDescriptionJob', 'C');
    const before = notices().length;
    await advance(25_001); // The generation deadline fires while C is awaited.
    expect(input().value).toBe('C');
    expect(input().disabled).toBe(true);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(notices()).toHaveLength(before);
    await flush(() => current.resolve(lookup('C')));
    expect(screen.getByRole('heading', { name: 'C 저장된 소개' })).toBeTruthy();
  });

  it('keeps manual recovery when the external C lookup fails', async () => {
    const fixture = setup('/products/sample');
    await flush(() => fireEvent.click(generating()));
    await flush(() => fixture.take('GenerateProductDescription').resolve(generation('B')));
    await advance();
    const latePoll = fixture.take('GetProductDescriptionJob', 'B');
    await navigate('/products/sample?descriptionJobId=C');
    const current = fixture.take('GetProductDescriptionJob', 'C');
    await flush(() => latePoll.resolve(lookup('B', 'in_progress')));
    await flush(() => current.reject('합성 C 조회 오류'));
    expect(notices()).toContainEqual(
      expect.objectContaining({ title: '후보 다시 열기 실패', message: '합성 C 조회 오류' })
    );
    expect(input().value).toBe('C');
    expect(input().disabled).toBe(false);
    expect(reopen().disabled).toBe(false);
    await submitId('C');
    await flush(() => fixture.take('GetProductDescriptionJob', 'C').resolve(lookup('C')));
    expect(screen.getByRole('heading', { name: 'C 저장된 소개' })).toBeTruthy();
  });

  it.each(['resolve', 'reject'] as const)(
    'keeps new generation D waiting after C recovery and late B mutation %s/finally',
    async ending => {
      const fixture = setup('/products/sample');
      await flush(() => fireEvent.click(generating()));
      const oldMutation = fixture.take('GenerateProductDescription');
      await navigate('/products/sample?descriptionJobId=C');
      await flush(() => fixture.take('GetProductDescriptionJob', 'C').reject('합성 C 조회 오류'));
      expect(input().value).toBe('C');
      expect(input().disabled).toBe(false);
      expect(reopen().disabled).toBe(false);
      expect(generating().disabled).toBe(false);
      await submitId('C');
      await flush(() => fixture.take('GetProductDescriptionJob', 'C').resolve(lookup('C')));
      expect(screen.getByRole('heading', { name: 'C 저장된 소개' })).toBeTruthy();
      await closePreview();
      await flush(() => fireEvent.click(generating()));
      const newMutation = fixture.take('GenerateProductDescription');
      const before = notices().length;
      const hiddenBefore = vi.mocked(notifications.hide).mock.calls.length;
      await flush(() =>
        ending === 'resolve'
          ? oldMutation.resolve(generation('B', 'completed'))
          : oldMutation.reject('늦은 B 생성 오류')
      );
      expect(new URL(window.location.href).searchParams.get('descriptionJobId')).toBe('C');
      expect(input().value).toBe('C');
      expect(input().disabled).toBe(true);
      expect(reopen().disabled).toBe(true);
      expect(screen.getByRole<HTMLButtonElement>('button', { name: 'AI 소개 생성 중...' }).disabled).toBe(true);
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(notices()).toHaveLength(before);
      expect(vi.mocked(notifications.hide).mock.calls).toHaveLength(hiddenBefore);
      await flush(() => newMutation.resolve(generation('D')));
      expect(new URL(window.location.href).searchParams.get('descriptionJobId')).toBe('D');
      expect(input().value).toBe('D');
      expect(input().disabled).toBe(true);
      await advance();
      await flush(() => fixture.take('GetProductDescriptionJob', 'D').resolve(lookup('D')));
      expect(screen.getByRole('heading', { name: 'D 저장된 소개' })).toBeTruthy();
      await closePreview();
      expect(input().disabled).toBe(false);
      expect(reopen().disabled).toBe(false);
      expect(generating().disabled).toBe(false);
    }
  );

  it.each(applyEndings)('ignores old A Apply %s while external C is still loading', async ending => {
    const fixture = setup();
    await flush(() => fixture.take('GetProductDescriptionJob', 'A').resolve(lookup('A')));
    const oldApply = await startApply(fixture, 'A');
    await navigate('/products/sample?descriptionJobId=C');
    const currentLookup = fixture.take('GetProductDescriptionJob', 'C');
    const before = notices().length;
    const hiddenBefore = vi.mocked(notifications.hide).mock.calls.length;
    await flush(() => finishApply(oldApply, ending));
    expect(window.location.pathname + window.location.search).toBe('/products/sample?descriptionJobId=C');
    expect(input().value).toBe('C');
    expect(input().disabled).toBe(true);
    expect(screen.getByRole<HTMLButtonElement>('button', { name: '여는 중...' }).disabled).toBe(true);
    expect(generating().disabled).toBe(false);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(notices()).toHaveLength(before);
    expect(vi.mocked(notifications.hide).mock.calls).toHaveLength(hiddenBefore);
    await flush(() => currentLookup.resolve(lookup('C')));
    expectCandidate('C');
    expect(input().disabled).toBe(false);
    const currentApply = await startApply(fixture, 'C');
    await flush(() => finishApply(currentApply, 'success', 'C'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(notices()).toContainEqual(expect.objectContaining({ title: '적용 완료' }));
  });

  it.each(applyEndings)('preserves opened C HTML, preview and edited input after old A Apply %s', async ending => {
    const fixture = setup();
    await flush(() => fixture.take('GetProductDescriptionJob', 'A').resolve(lookup('A')));
    const oldApply = await startApply(fixture, 'A');
    await navigate('/products/sample?descriptionJobId=C');
    await flush(() => fixture.take('GetProductDescriptionJob', 'C').resolve(lookup('C')));
    expectCandidate('C');
    await flush(() => fireEvent.change(input(), { target: { value: 'manual-input-kept' } }));
    const before = notices().length;
    await flush(() => finishApply(oldApply, ending));
    expect(window.location.search).toBe('?descriptionJobId=C');
    expectCandidate('C');
    expect(input().value).toBe('manual-input-kept');
    expect(input().disabled).toBe(false);
    expect(reopen().disabled).toBe(false);
    expect(generating().disabled).toBe(false);
    expect(notices()).toHaveLength(before);
    const currentApply = await startApply(fixture, 'C');
    await flush(() => finishApply(currentApply, 'success', 'C'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it.each(applyEndings)('does not let old A Apply %s/finally release the newer C Apply', async ending => {
    const fixture = setup();
    await flush(() => fixture.take('GetProductDescriptionJob', 'A').resolve(lookup('A')));
    const oldApply = await startApply(fixture, 'A');
    await navigate('/products/sample?descriptionJobId=C');
    await flush(() => fixture.take('GetProductDescriptionJob', 'C').resolve(lookup('C')));
    const currentApply = await startApply(fixture, 'C');
    await flush(() => fireEvent.change(input(), { target: { value: 'C-apply-input-kept' } }));
    const before = notices().length;
    await flush(() => finishApply(oldApply, ending));
    expect(window.location.search).toBe('?descriptionJobId=C');
    expectCandidate('C', true);
    expect(input().value).toBe('C-apply-input-kept');
    expect(input().disabled).toBe(false);
    expect(generating().disabled).toBe(true);
    expect(notices()).toHaveLength(before);
    // A's finally must not allow another C submission or close C's preview.
    await flush(() => fireEvent.click(applyingButton(true)));
    expect(fixture.count('ApplyProductDescriptionCandidate')).toBe(2);
    await flush(() => finishApply(currentApply, 'success', 'C'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(generating().disabled).toBe(false);
    expect(input().value).toBe('C-apply-input-kept');
  });

  it.each(['/products/sample', '/products/other'])(
    'ends A Apply authority on ID removal at %s without erasing recovery input',
    async address => {
      const fixture = setup();
      await flush(() => fixture.take('GetProductDescriptionJob', 'A').resolve(lookup('A')));
      const oldApply = await startApply(fixture, 'A');
      await navigate(address);
      // ID removal preserves the already open stored preview, but ends its old Apply wait.
      expectCandidate('A');
      await closePreview();
      await flush(() => fireEvent.change(input(), { target: { value: 'manual-recovery' } }));
      const before = notices().length;
      await flush(() => finishApply(oldApply, 'success'));
      expect(window.location.pathname + window.location.search).toBe(address);
      expect(input().value).toBe('manual-recovery');
      expect(input().disabled).toBe(false);
      expect(reopen().disabled).toBe(false);
      expect(generating().disabled).toBe(false);
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(notices()).toHaveLength(before);
      await submitId('manual-recovery');
      await flush(() => fixture.take('GetProductDescriptionJob', 'manual-recovery').resolve(lookup('manual-recovery')));
      await flush(() => fixture.take('GetProductDescriptionJob', 'manual-recovery').resolve(lookup('manual-recovery')));
      expectCandidate('manual-recovery');
    }
  );

  it('ignores old A stale failure after switching products with another candidate ID', async () => {
    const fixture = setup();
    await flush(() => fixture.take('GetProductDescriptionJob', 'A').resolve(lookup('A')));
    const oldApply = await startApply(fixture, 'A');
    await navigate('/products/other?descriptionJobId=C');
    const otherLookup = fixture.take('GetProductDescriptionJob', 'C');
    expect(otherLookup.variables).toEqual({ id: 'C', slug: 'other' });
    const otherJob = {
      tempProductBySlug: { __typename: 'Product', id: 'product-2' },
      productDescriptionJob: job('C', 'completed', 'product-2'),
    };
    await flush(() => otherLookup.resolve(otherJob));
    const before = notices().length;
    await flush(() => finishApply(oldApply, 'stale'));
    expect(window.location.pathname + window.location.search).toBe('/products/other?descriptionJobId=C');
    expectCandidate('C');
    expect(input().value).toBe('C');
    expect(input().disabled).toBe(false);
    expect(notices()).toHaveLength(before);
  });

  it.each(['success', 'stale'] as const)(
    'revokes old A Apply %s as soon as manual C reopening starts',
    async ending => {
      const fixture = setup();
      await flush(() => fixture.take('GetProductDescriptionJob', 'A').resolve(lookup('A')));
      const oldApply = await startApply(fixture, 'A');
      await submitId('C');
      const currentLookup = fixture.take('GetProductDescriptionJob', 'C');
      const before = notices().length;
      await flush(() => finishApply(oldApply, ending));
      expect(window.location.search).toBe('?descriptionJobId=A'); // Manual lookup has not succeeded yet.
      expect(input().value).toBe('C');
      expect(input().disabled).toBe(true);
      expect(screen.getByRole<HTMLButtonElement>('button', { name: '여는 중...' }).disabled).toBe(true);
      expectCandidate('A');
      expect(notices()).toHaveLength(before);
      await flush(() => currentLookup.resolve(lookup('C')));
      await flush(() => fixture.take('GetProductDescriptionJob', 'C').resolve(lookup('C')));
      expect(window.location.search).toBe('?descriptionJobId=C');
      expectCandidate('C');
      const currentApply = await startApply(fixture, 'C');
      await flush(() => finishApply(currentApply, 'success', 'C'));
      expect(screen.queryByRole('dialog')).toBeNull();
    }
  );

  it.each(['success', 'stale'] as const)(
    'does not restore old A Apply %s authority when the same ID is revisited',
    async ending => {
      const fixture = setup();
      await flush(() => fixture.take('GetProductDescriptionJob', 'A').resolve(lookup('A')));
      const oldApply = await startApply(fixture, 'A');
      await navigate('/products/sample');
      await navigate('/products/sample?descriptionJobId=A');
      await flush(() => fixture.take('GetProductDescriptionJob', 'A').resolve(lookup('A')));
      const currentApply = await startApply(fixture, 'A');
      const before = notices().length;
      await flush(() => finishApply(oldApply, ending));
      expect(window.location.search).toBe('?descriptionJobId=A');
      expectCandidate('A', true);
      expect(
        screen.queryByText('과거에 적용된 후보입니다. 다시 적용해도 이후 사람 편집을 덮어쓰지 않습니다.')
      ).toBeNull();
      expect(generating().disabled).toBe(true);
      expect(notices()).toHaveLength(before);
      await flush(() => finishApply(currentApply, 'alreadyApplied'));
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(notices()).toContainEqual(expect.objectContaining({ title: '과거에 적용된 후보' }));
    }
  );

  it.each(['success', 'network'] as const)('stops Apply %s notifications and follow-up after unmount', async ending => {
    const fixture = setup();
    await flush(() => fixture.take('GetProductDescriptionJob', 'A').resolve(lookup('A')));
    const oldApply = await startApply(fixture, 'A');
    fixture.unmount();
    const before = notices().length;
    await flush(() => finishApply(oldApply, ending));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(notices()).toHaveLength(before);
    expect(fixture.count('GetProductDescriptionJob')).toBe(1);
  });

  it('preserves C stale recovery and its notification after late A success', async () => {
    const fixture = setup();
    await flush(() => fixture.take('GetProductDescriptionJob', 'A').resolve(lookup('A')));
    const oldApply = await startApply(fixture, 'A');
    await navigate('/products/sample?descriptionJobId=C');
    await flush(() => fixture.take('GetProductDescriptionJob', 'C').resolve(lookup('C')));
    const currentApply = await startApply(fixture, 'C');
    await flush(() => currentApply.graphQLError('C 원문이 바뀌었습니다.', 'STALE_CANDIDATE'));
    await flush(() => fireEvent.change(input(), { target: { value: 'C-recovery-input' } }));
    const before = notices().length;
    await flush(() => finishApply(oldApply, 'success'));
    expect(window.location.search).toBe('?descriptionJobId=C');
    expect(screen.getByRole('heading', { name: 'C 저장된 소개' })).toBeTruthy();
    expect(screen.getByText('후보 작업 ID: C')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toContain('C 원문이 바뀌었습니다.');
    expect(input().value).toBe('C-recovery-input');
    expect(input().disabled).toBe(false);
    expect(applyingButton().disabled).toBe(false);
    expect(notices()).toHaveLength(before);
    expect(notices()[notices().length - 1]).toEqual(
      expect.objectContaining({ title: '적용 실패', message: 'C 원문이 바뀌었습니다.' })
    );
    const retry = await startApply(fixture, 'C');
    await flush(() => finishApply(retry, 'success', 'C'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('keeps failed C lookup input and notification after late A network failure, then resumes C', async () => {
    const fixture = setup();
    await flush(() => fixture.take('GetProductDescriptionJob', 'A').resolve(lookup('A')));
    const oldApply = await startApply(fixture, 'A');
    await navigate('/products/sample?descriptionJobId=C');
    await flush(() => fixture.take('GetProductDescriptionJob', 'C').reject('C 조회 실패 보존'));
    const before = notices().length;
    await flush(() => finishApply(oldApply, 'network'));
    expect(window.location.search).toBe('?descriptionJobId=C');
    expect(input().value).toBe('C');
    expect(input().disabled).toBe(false);
    expect(reopen().disabled).toBe(false);
    expect(generating().disabled).toBe(false);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(notices()).toHaveLength(before);
    expect(notices()[notices().length - 1]).toEqual(
      expect.objectContaining({ title: '후보 다시 열기 실패', message: 'C 조회 실패 보존' })
    );
    await submitId('C');
    await flush(() => fixture.take('GetProductDescriptionJob', 'C').resolve(lookup('C')));
    expectCandidate('C');
    const currentApply = await startApply(fixture, 'C');
    await flush(() => finishApply(currentApply, 'success', 'C'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it.each(applyEndings)('keeps current Apply %s behavior and preserves failed input for retry', async ending => {
    const fixture = setup();
    const stored = lookup('A');
    await flush(() =>
      fixture.take('GetProductDescriptionJob', 'A').resolve({
        ...stored,
        productDescriptionJob: {
          ...stored.productDescriptionJob,
          appliedAt: ending === 'alreadyApplied' ? '2026-10-15T00:00:00.000Z' : null,
        },
      })
    );
    if (ending === 'alreadyApplied') {
      expect(
        screen.getByText('과거에 적용된 후보입니다. 다시 적용해도 이후 사람 편집을 덮어쓰지 않습니다.')
      ).toBeTruthy();
    }
    await flush(() => fireEvent.change(input(), { target: { value: 'failed-input-kept' } }));
    const currentApply = await startApply(fixture, 'A');
    await flush(() => finishApply(currentApply, ending));
    expect(window.location.search).toBe('?descriptionJobId=A');
    expect(input().value).toBe('failed-input-kept');
    expect(input().disabled).toBe(false);
    expect(generating().disabled).toBe(false);
    if (ending === 'success' || ending === 'alreadyApplied') {
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(notices()).toContainEqual(
        expect.objectContaining({
          title: ending === 'alreadyApplied' ? '과거에 적용된 후보' : '적용 완료',
          color: 'teal',
        })
      );
      if (ending === 'alreadyApplied') {
        expect(notices()).toContainEqual(
          expect.objectContaining({ message: expect.stringContaining('이후 사람 편집은 그대로 유지') })
        );
      }
      return;
    }
    expect(screen.getByRole('heading', { name: 'A 저장된 소개' })).toBeTruthy();
    expect(applyingButton().disabled).toBe(false);
    const messages = {
      stale: '합성 근거 변경',
      network: '합성 Apply 네트워크 오류',
      graphql: '합성 Apply GraphQL 오류',
      failed: '합성 생성 실패',
    };
    expect(notices()).toContainEqual(
      expect.objectContaining({ title: '적용 실패', message: messages[ending], color: 'red' })
    );
    if (ending === 'stale') {
      expect(screen.getByRole('alert').textContent).toContain('적용 보류: 근거가 변경되었습니다.');
      expect(screen.getByRole('alert').textContent).toContain('수동 편집은 유지됩니다.');
    } else {
      expect(screen.queryByRole('alert')).toBeNull();
    }
    const retry = await startApply(fixture, 'A');
    await flush(() => finishApply(retry, 'success'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(input().value).toBe('failed-input-kept');
    expect(notices()).toContainEqual(expect.objectContaining({ title: '적용 완료' }));
  });

  it('stops generation B writes after unmount', async () => {
    const fixture = setup('/products/sample');
    await flush(() => fireEvent.click(generating()));
    await flush(() => fixture.take('GenerateProductDescription').resolve(generation('B')));
    await advance();
    const latePoll = fixture.take('GetProductDescriptionJob', 'B');
    cleanup();
    await flush(() => latePoll.resolve(lookup('B')));
    await advance();
    expect(notices().some(notice => notice.title === 'AI 소개 초안 생성 완료')).toBe(false);
  });
});
