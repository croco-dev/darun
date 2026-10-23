import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import {
  ProductContentSyncStatusOnIndexProductButtonDocument,
  type ProductContentSyncStatusOnIndexProductButtonQuery,
} from '@darun/provider-graphql';
import { notifications } from '@mantine/notifications';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useIndexProductButton } from '../useIndexProductButton';

vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));

const identity = {
  intentId: 'intent-1',
  productId: 'product-1',
  sourceRevision: '9007199254740993',
};
function response(
  status = 'completed',
  overrides: Partial<typeof identity> = {},
  translation: { status: string; overrides?: Partial<typeof identity> } | null = null
) {
  const intent = {
    ...identity,
    ...overrides,
    status,
    error: status === 'failed' ? 'SEARCH_UNAVAILABLE' : null,
  };
  const translationIntent = translation
    ? {
        ...identity,
        ...translation.overrides,
        intentId: translation.overrides?.intentId ?? 'translation-intent-1',
        status: translation.status,
        error: null,
      }
    : null;
  return {
    productContentSyncStatus: {
      productId: intent.productId,
      sourceRevision: intent.sourceRevision,
      searchStatus: status,
      translationDispatchStatus: translation ? 'registered' : 'not_required',
      translationJobId: null,
      translationJobStatus: null,
      translationJobDispatchStatus: null,
      searchIntent: intent,
      translationIntent: translationIntent ?? null,
    },
  };
}
function setup() {
  const lookups: {
    slug: string;
    resolve: (data: ProductContentSyncStatusOnIndexProductButtonQuery) => void;
    reject: () => void;
  }[] = [];
  const retries: {
    slug: string;
    resolve: (data?: ProductContentSyncStatusOnIndexProductButtonQuery) => void;
    reject: () => void;
    failGraphql: () => void;
  }[] = [];
  let nextIdentity = identity;
  const link = new ApolloLink(
    operation =>
      new Observable(observer => {
        if (operation.operationName === 'IndexProductOnIndexProductButton') {
          observer.next({
            data: { indexProduct: { ...nextIdentity, status: 'pending' } },
          });
          observer.complete();
        } else if (operation.operationName === 'RetryProductContentSyncOnIndexProductButton') {
          retries.push({
            slug: operation.variables.slug,
            resolve: (data = response('pending')) => {
              observer.next({ data: { retryProductContentSync: data.productContentSyncStatus } });
              observer.complete();
            },
            reject: () => observer.error(new Error('retry network failed')),
            failGraphql: () => {
              observer.next({ errors: [{ message: 'retry GraphQL failed' }] });
              observer.complete();
            },
          });
        } else {
          lookups.push({
            slug: operation.variables.slug,
            resolve: data => {
              observer.next({ data });
              observer.complete();
            },
            reject: () => observer.error(new Error('fresh lookup failed')),
          });
        }
      })
  );
  const client = new ApolloClient({ cache: new InMemoryCache(), link });
  const wrapper = ({ children }: PropsWithChildren) => <ApolloProvider client={client}>{children}</ApolloProvider>;
  const hook = renderHook(({ slug }) => useIndexProductButton({ slug }), {
    wrapper,
    initialProps: { slug: 'sample' },
  });
  return {
    ...hook,
    lookups,
    retries,
    querySlugs: () => Array.from(client.getObservableQueries(), query => query.variables.slug),
    client,
    setIdentity: (value: typeof identity) => {
      nextIdentity = value;
    },
  };
}
async function flush(action: () => void) {
  await act(async () => {
    action();
    await Promise.resolve();
  });
}
async function reserve(result: { current: { indexProduct: () => Promise<void> } }) {
  let pending!: Promise<void>;
  await flush(() => {
    pending = result.current.indexProduct();
  });
  return { pending };
}
async function retry(result: { current: { retrySync: () => Promise<void> } }) {
  let pending!: Promise<void>;
  await flush(() => {
    pending = result.current.retrySync();
  });
  return { pending };
}
async function setupFailed() {
  const fixture = setup();
  await flush(() => fixture.lookups.shift()!.resolve(response('failed')));
  const reservation = await reserve(fixture.result);
  await flush(() => fixture.lookups.shift()!.resolve(response('failed')));
  await act(async () => {
    await reservation.pending;
  });
  expect(fixture.result.current).toMatchObject({ loading: false, error: 'SEARCH_UNAVAILABLE' });
  vi.mocked(notifications.show).mockClear();
  return fixture;
}
const successes = () => vi.mocked(notifications.show).mock.calls.filter(([notice]) => notice.color === 'teal');
const supersessions = () =>
  vi.mocked(notifications.show).mock.calls.filter(([notice]) => String(notice.message).includes('대체'));
const newerIdentity = { ...identity, intentId: 'intent-2', sourceRevision: '9007199254740994' };
async function tick(milliseconds = 1000) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds);
  });
}
async function setupWaiting(reserved = identity) {
  const fixture = setup();
  fixture.setIdentity(reserved);
  await flush(() => fixture.lookups.shift()!.resolve(response('pending', reserved)));
  const reservation = await reserve(fixture.result);
  await flush(() => fixture.lookups.shift()!.resolve(response('pending', reserved)));
  await act(async () => {
    await reservation.pending;
  });
  expect(fixture.result.current.loading).toBe(true);
  vi.mocked(notifications.show).mockClear();
  return fixture;
}

describe('index completion through real Apollo default cache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it.each(['intent-1', 'intent-2'])(
    'recovers %s after refetch failure, including reused identical cached completion',
    async intentId => {
      const fixture = setup();
      const completed = response();
      await flush(() => fixture.lookups.shift()!.resolve(completed));
      const first = await reserve(fixture.result);
      await flush(() => fixture.lookups.shift()!.resolve(completed));
      await act(async () => {
        await first.pending;
      });
      expect(successes()).toHaveLength(1);
      const cached = fixture.result.current.syncStatus;
      fixture.setIdentity({ ...identity, intentId });
      const second = await reserve(fixture.result);
      expect(successes()).toHaveLength(1);
      await flush(() => fixture.lookups.shift()!.reject());
      await act(async () => {
        await second.pending;
      });
      expect(successes()).toHaveLength(1);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
      expect(successes()).toHaveLength(1);
      await flush(() =>
        fixture.lookups
          .shift()!
          .resolve(intentId === identity.intentId ? completed : response('completed', { intentId }))
      );
      if (intentId === identity.intentId) expect(fixture.result.current.syncStatus).toBe(cached);
      expect(fixture.result.current.loading).toBe(false);
      expect(successes()).toHaveLength(2);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000);
      });
      expect(successes()).toHaveLength(2);
    }
  );

  it('never completes from cached terminal or a pre-reservation in-flight lookup', async () => {
    const fixture = setup();
    const old = fixture.lookups.shift()!;
    const reservation = await reserve(fixture.result);
    await flush(() => old.resolve(response()));
    expect(successes()).toHaveLength(0);
    await flush(() => fixture.lookups.shift()!.reject());
    await act(async () => {
      await reservation.pending;
    });
    expect(successes()).toHaveLength(0);
    expect(fixture.result.current.error).toBe('fresh lookup failed');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(successes()).toHaveLength(0);
    await flush(() => fixture.lookups.shift()!.resolve(response()));
    expect(successes()).toHaveLength(1);
  });

  it('keeps pending and in_progress, ignores foreign identities, and preserves failed retry', async () => {
    const fixture = setup();
    await flush(() => fixture.lookups.shift()!.resolve(response()));
    const reservation = await reserve(fixture.result);
    await flush(() => fixture.lookups.shift()!.resolve(response('pending')));
    await act(async () => {
      await reservation.pending;
    });
    for (const data of [
      response('in_progress'),
      response('completed', { intentId: 'foreign' }),
      response('completed', { productId: 'foreign-product' }),
    ]) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
      await flush(() => fixture.lookups.shift()!.resolve(data));
      expect(fixture.result.current.loading).toBe(true);
      expect(successes()).toHaveLength(0);
    }
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    await flush(() => fixture.lookups.shift()!.resolve(response('failed')));
    expect(fixture.result.current).toMatchObject({
      loading: false,
      error: 'SEARCH_UNAVAILABLE',
    });
    const retry = await reserve(fixture.result);
    expect(successes()).toHaveLength(0);
    await flush(() => fixture.lookups.shift()!.resolve(response()));
    await act(async () => {
      await retry.pending;
    });
    expect(successes()).toHaveLength(1);
  });

  it('rejects late lookup after route A→B→A and after a newer same-identity request', async () => {
    const fixture = setup();
    await flush(() => fixture.lookups.shift()!.resolve(response()));
    const first = await reserve(fixture.result);
    const late = fixture.lookups.shift()!;
    fixture.rerender({ slug: 'other' });
    fixture.rerender({ slug: 'sample' });
    await flush(() => late.resolve(response()));
    await act(async () => {
      await first.pending;
    });
    expect(successes()).toHaveLength(0);
    // Complete the route's ordinary status fetches, not a current reservation.
    await flush(() => {
      fixture.lookups.splice(0).forEach(lookup => lookup.resolve(response()));
    });
    const second = await reserve(fixture.result);
    const stale = fixture.lookups.shift()!;
    const third = await reserve(fixture.result);
    const fresh = fixture.lookups.shift()!;
    await flush(() => stale.resolve(response()));
    await act(async () => {
      await second.pending;
    });
    expect(successes()).toHaveLength(0);
    await flush(() => fresh.resolve(response()));
    await act(async () => {
      await third.pending;
    });
    expect(successes()).toHaveLength(1);
  });

  it.each(['success', 'network error', 'GraphQL error'])(
    'leaves B query variables, Product/intent observation and notices untouched by A retry %s',
    async outcome => {
      const fixture = await setupFailed();
      const old = await retry(fixture.result);
      const mutation = fixture.retries.shift()!;
      expect(mutation.slug).toBe('sample');
      expect(fixture.result.current.retrying).toBe(true);
      const other = { intentId: 'intent-B', productId: 'product-B', sourceRevision: '9007199254741017' };
      fixture.setIdentity(other);
      fixture.rerender({ slug: 'other' });
      await flush(() => fixture.lookups.shift()!.resolve(response('pending', other)));
      const current = await reserve(fixture.result);
      const bFailure = response('failed', other);
      bFailure.productContentSyncStatus.searchIntent.error = 'B_SEARCH_FAILED';
      await flush(() => fixture.lookups.shift()!.resolve(bFailure));
      await act(async () => {
        await current.pending;
      });
      const bStatus = fixture.result.current.syncStatus;
      vi.mocked(notifications.show).mockClear();
      await flush(() => {
        if (outcome === 'success') mutation.resolve();
        else if (outcome === 'network error') mutation.reject();
        else mutation.failGraphql();
      });
      await act(async () => {
        await old.pending;
      });
      expect(fixture.querySlugs()).toEqual(['other']);
      expect(fixture.lookups).toHaveLength(0);
      expect(fixture.result.current.syncStatus).toBe(bStatus);
      expect(fixture.result.current.syncStatus?.searchIntent).toMatchObject(other);
      expect(fixture.result.current).toMatchObject({ loading: false, error: 'B_SEARCH_FAILED' });
      expect(notifications.show).not.toHaveBeenCalled();
    }
  );

  it.each(['success', 'lookup error'])(
    'ignores A retry status %s already in flight when B begins waiting',
    async outcome => {
      const fixture = await setupFailed();
      const old = await retry(fixture.result);
      await flush(() => fixture.retries.shift()!.resolve());
      const late = fixture.lookups.shift()!;
      expect(late.slug).toBe('sample');
      const other = { intentId: 'intent-B', productId: 'product-B', sourceRevision: '9007199254741017' };
      fixture.setIdentity(other);
      fixture.rerender({ slug: 'other' });
      await flush(() => fixture.lookups.shift()!.resolve(response('pending', other)));
      const current = await reserve(fixture.result);
      await flush(() => fixture.lookups.shift()!.resolve(response('pending', other)));
      await act(async () => {
        await current.pending;
      });
      vi.mocked(notifications.show).mockClear();
      await flush(() => {
        if (outcome === 'success') late.resolve(response());
        else late.reject();
      });
      await act(async () => {
        await old.pending;
      });
      expect(fixture.querySlugs()).toEqual(['other']);
      expect(fixture.result.current.syncStatus?.searchIntent).toMatchObject({ ...other, status: 'pending' });
      expect(fixture.result.current).toMatchObject({ loading: true, error: undefined });
      expect(notifications.show).not.toHaveBeenCalled();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
      expect(fixture.lookups.map(lookup => lookup.slug)).toEqual(['other']);
      await flush(() => fixture.lookups.shift()!.resolve(response('completed', other)));
      expect(fixture.result.current.loading).toBe(false);
      expect(successes()).toHaveLength(1);
    }
  );

  it.each(['mutation', 'status'])('does not restore A retry authority after A→B→A during %s', async stage => {
    const fixture = await setupFailed();
    const old = await retry(fixture.result);
    const mutation = fixture.retries.shift()!;
    if (stage === 'status') await flush(() => mutation.resolve());
    const late = stage === 'status' ? fixture.lookups.shift()! : undefined;
    fixture.rerender({ slug: 'other' });
    await flush(() =>
      fixture.lookups.shift()!.resolve(response('pending', { productId: 'product-B', intentId: 'intent-B' }))
    );
    fixture.rerender({ slug: 'sample' });
    await flush(() => fixture.lookups.shift()!.resolve(response('failed')));
    await flush(() => {
      if (late) late.resolve(response());
      else mutation.resolve();
    });
    await act(async () => {
      await old.pending;
    });
    expect(fixture.querySlugs()).toEqual(['sample']);
    expect(fixture.lookups).toHaveLength(0);
    expect(fixture.result.current.loading).toBe(false);
    expect(notifications.show).not.toHaveBeenCalled();
  });

  it.each([
    { action: 'index', stage: 'mutation' },
    { action: 'retry', stage: 'mutation' },
    { action: 'index', stage: 'status' },
    { action: 'retry', stage: 'status' },
  ])('a newer same-route $action owns the wait while the earlier retry awaits $stage', async ({ action, stage }) => {
    const fixture = await setupFailed();
    const old = await retry(fixture.result);
    const mutation = fixture.retries.shift()!;
    if (stage === 'status') await flush(() => mutation.resolve());
    const late = stage === 'status' ? fixture.lookups.shift()! : undefined;
    const current = action === 'index' ? await reserve(fixture.result) : await retry(fixture.result);
    if (action === 'retry') await flush(() => fixture.retries.shift()!.resolve());
    const fresh = fixture.lookups.shift()!;
    await flush(() => {
      if (late) late.resolve(response());
      else mutation.resolve();
    });
    await act(async () => {
      await old.pending;
    });
    expect(fixture.lookups).toHaveLength(0);
    expect(fixture.querySlugs()).toEqual(['sample']);
    expect(notifications.show).not.toHaveBeenCalled();
    await flush(() => fresh.resolve(response('pending')));
    await act(async () => {
      await current.pending;
    });
    expect(fixture.result.current.loading).toBe(true);
    expect(successes()).toHaveLength(0);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    await flush(() => fixture.lookups.shift()!.resolve(response()));
    expect(fixture.result.current.loading).toBe(false);
    expect(successes()).toHaveLength(1);
  });

  it.each(['mutation', 'status'])('ignores retry settlement after unmount during %s', async stage => {
    const fixture = await setupFailed();
    const old = await retry(fixture.result);
    const mutation = fixture.retries.shift()!;
    if (stage === 'status') await flush(() => mutation.resolve());
    const late = stage === 'status' ? fixture.lookups.shift()! : undefined;
    fixture.unmount();
    await flush(() => {
      if (late) late.reject();
      else mutation.resolve();
    });
    await act(async () => {
      await old.pending;
    });
    expect(fixture.lookups).toHaveLength(0);
    expect(notifications.show).not.toHaveBeenCalled();
  });

  it('requires a fresh status after current retry and distinguishes registered translation from completion', async () => {
    const fixture = await setupFailed();
    const current = await retry(fixture.result);
    await flush(() => fixture.retries.shift()!.resolve());
    expect(fixture.result.current.loading).toBe(true);
    expect(successes()).toHaveLength(0);
    const pending = response('pending');
    pending.productContentSyncStatus.translationDispatchStatus = 'registered';
    await flush(() => fixture.lookups.shift()!.resolve(pending));
    await act(async () => {
      await current.pending;
    });
    expect(fixture.result.current.syncStatus).toMatchObject({
      searchStatus: 'pending',
      translationDispatchStatus: 'registered',
      translationJobStatus: null,
    });
    expect(fixture.result.current.loading).toBe(true);
    expect(notifications.show).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ color: 'blue' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    await flush(() => fixture.lookups.shift()!.resolve(response()));
    expect(fixture.result.current.loading).toBe(false);
    expect(successes()).toHaveLength(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(successes()).toHaveLength(1);
  });

  it.each(['network', 'GraphQL', 'lookup'])(
    'shows a current %s failure and recovers on explicit retry',
    async failure => {
      const fixture = await setupFailed();
      const first = await retry(fixture.result);
      const mutation = fixture.retries.shift()!;
      await flush(() => {
        if (failure === 'network') mutation.reject();
        else if (failure === 'GraphQL') mutation.failGraphql();
        else mutation.resolve();
      });
      if (failure === 'lookup') await flush(() => fixture.lookups.shift()!.reject());
      await act(async () => {
        await first.pending;
      });
      expect(fixture.result.current.loading).toBe(false);
      expect(fixture.result.current.error).toContain(failure === 'lookup' ? 'fresh lookup failed' : `retry ${failure}`);
      expect(notifications.show).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ color: 'red' }));
      expect(successes()).toHaveLength(0);
      const second = await retry(fixture.result);
      await flush(() => fixture.retries.shift()!.resolve());
      await flush(() => fixture.lookups.shift()!.resolve(response()));
      await act(async () => {
        await second.pending;
      });
      expect(fixture.result.current).toMatchObject({ loading: false, error: undefined });
      expect(successes()).toHaveLength(1);
    }
  );

  it('does not refetch or notify for a retry response belonging to a different Product', async () => {
    const fixture = await setupFailed();
    const current = await retry(fixture.result);
    await flush(() => fixture.retries.shift()!.resolve(response('pending', { productId: 'foreign-product' })));
    await act(async () => {
      await current.pending;
    });
    expect(fixture.lookups).toHaveLength(0);
    expect(notifications.show).not.toHaveBeenCalled();
  });

  it.each(['pending', 'in_progress', 'failed', 'completed'])(
    'ends A polling and wait without success when a fresh poll observes newer B %s',
    async status => {
      const fixture = await setupWaiting();
      await tick();
      await flush(() => fixture.lookups.shift()!.resolve(response(status, newerIdentity)));
      expect(fixture.result.current).toMatchObject({ loading: false, error: undefined });
      expect(fixture.result.current.syncStatus).toMatchObject({
        searchStatus: status,
        searchIntent: { ...newerIdentity, status, error: status === 'failed' ? 'SEARCH_UNAVAILABLE' : null },
      });
      expect(successes()).toHaveLength(0);
      expect(supersessions()).toHaveLength(1);
      expect(supersessions()[0][0]).toMatchObject({ color: 'blue' });
      const latest = fixture.result.current.syncStatus;
      await tick(4000);
      expect(fixture.lookups).toHaveLength(0);
      expect(fixture.result.current.syncStatus).toBe(latest);
      expect(successes()).toHaveLength(0);
      expect(supersessions()).toHaveLength(1);
    }
  );

  it.each([
    ['9', '10'],
    ['9007199254740993', '9007199254740994'],
    ['9007199254740992', '9007199254740993'],
  ])('compares reservation %s and newer intent %s as integers in the first fresh lookup', async (older, newer) => {
    const fixture = setup();
    fixture.setIdentity({ ...identity, sourceRevision: older });
    await flush(() => fixture.lookups.shift()!.resolve(response('pending', { sourceRevision: older })));
    const reservation = await reserve(fixture.result);
    await flush(() =>
      fixture.lookups.shift()!.resolve(response('completed', { intentId: 'intent-newer', sourceRevision: newer }))
    );
    await act(async () => {
      await reservation.pending;
    });
    expect(fixture.result.current.loading).toBe(false);
    expect(fixture.result.current.syncStatus?.searchIntent?.sourceRevision).toBe(newer);
    expect(supersessions()).toHaveLength(1);
    expect(successes()).toHaveLength(0);
    await tick(3000);
    expect(fixture.lookups).toHaveLength(0);
  });

  it.each(['index', 'retry'])(
    'observes B anew through current %s and succeeds only on B completed once',
    async action => {
      const fixture = await setupWaiting();
      await tick();
      await flush(() =>
        fixture.lookups.shift()!.resolve(response(action === 'retry' ? 'failed' : 'pending', newerIdentity))
      );
      expect(fixture.result.current.loading).toBe(false);
      expect(successes()).toHaveLength(0);
      fixture.setIdentity(newerIdentity);
      vi.mocked(notifications.show).mockClear();
      const current = action === 'index' ? await reserve(fixture.result) : await retry(fixture.result);
      if (action === 'retry') await flush(() => fixture.retries.shift()!.resolve(response('pending', newerIdentity)));
      expect(successes()).toHaveLength(0);
      await flush(() => fixture.lookups.shift()!.resolve(response('pending', newerIdentity)));
      await act(async () => {
        await current.pending;
      });
      expect(fixture.result.current.loading).toBe(true);
      expect(supersessions()).toHaveLength(0);
      expect(successes()).toHaveLength(0);
      await tick();
      await flush(() => fixture.lookups.shift()!.resolve(response('in_progress', newerIdentity)));
      expect(fixture.result.current.loading).toBe(true);
      expect(successes()).toHaveLength(0);
      await tick();
      await flush(() => fixture.lookups.shift()!.resolve(response('completed', newerIdentity)));
      expect(fixture.result.current.loading).toBe(false);
      expect(successes()).toHaveLength(1);
      await tick(3000);
      expect(fixture.lookups).toHaveLength(0);
      expect(successes()).toHaveLength(1);
    }
  );

  it.each([
    { name: 'same revision different ID', overrides: { intentId: 'foreign' } },
    { name: 'older revision different ID', overrides: { intentId: 'foreign', sourceRevision: '9007199254740992' } },
    { name: 'newer revision different Product', overrides: { ...newerIdentity, productId: 'foreign-product' } },
    { name: 'same ID with an unreserved revision', overrides: { sourceRevision: newerIdentity.sourceRevision } },
  ])('keeps waiting rather than superseding from $name', async ({ overrides }) => {
    const fixture = await setupWaiting();
    await tick();
    await flush(() => fixture.lookups.shift()!.resolve(response('completed', overrides)));
    expect(fixture.result.current.loading).toBe(true);
    expect(supersessions()).toHaveLength(0);
    expect(successes()).toHaveLength(0);
    await tick();
    expect(fixture.lookups).toHaveLength(1);
    await flush(() => fixture.lookups.shift()!.resolve(response()));
    expect(successes()).toHaveLength(1);
  });

  it('requires the search intent revision, not the Product global revision or mismatched envelope Product', async () => {
    const fixture = await setupWaiting();
    const globalOnly = response('pending');
    globalOnly.productContentSyncStatus.sourceRevision = newerIdentity.sourceRevision;
    const foreignEnvelope = response('completed', newerIdentity);
    foreignEnvelope.productContentSyncStatus.productId = 'foreign-product';
    for (const data of [globalOnly, foreignEnvelope]) {
      await tick();
      await flush(() => fixture.lookups.shift()!.resolve(data));
      expect(fixture.result.current.loading).toBe(true);
      expect(supersessions()).toHaveLength(0);
      expect(successes()).toHaveLength(0);
    }
    await tick();
    await flush(() => fixture.lookups.shift()!.resolve(response()));
    expect(successes()).toHaveLength(1);
  });

  it('does not terminate the wait from a cache-only update showing newer B', async () => {
    const fixture = await setupWaiting();
    await flush(() => {
      fixture.client.writeQuery({
        query: ProductContentSyncStatusOnIndexProductButtonDocument,
        variables: { slug: 'sample' },
        data: response('completed', newerIdentity),
      });
    });
    expect(fixture.result.current.loading).toBe(true);
    expect(supersessions()).toHaveLength(0);
    expect(successes()).toHaveLength(0);
    await tick();
    expect(fixture.lookups).toHaveLength(1);
    await flush(() => fixture.lookups.shift()!.resolve(response('completed', newerIdentity)));
    expect(fixture.result.current.loading).toBe(false);
    expect(supersessions()).toHaveLength(1);
    expect(successes()).toHaveLength(0);
    await tick(3000);
    expect(fixture.lookups).toHaveLength(0);
  });

  it('does not supersede from cache, a lookup failure, or a pre-reservation response showing B', async () => {
    const fixture = setup();
    const beforeReservation = fixture.lookups.shift()!;
    const reservation = await reserve(fixture.result);
    await flush(() => beforeReservation.resolve(response('completed', newerIdentity)));
    expect(fixture.result.current.syncStatus?.searchIntent).toMatchObject(newerIdentity);
    expect(fixture.result.current.loading).toBe(true);
    expect(supersessions()).toHaveLength(0);
    await flush(() => fixture.lookups.shift()!.reject());
    await act(async () => {
      await reservation.pending;
    });
    expect(fixture.result.current).toMatchObject({ loading: false, error: 'fresh lookup failed' });
    expect(supersessions()).toHaveLength(0);
    expect(successes()).toHaveLength(0);
    await tick();
    await flush(() => fixture.lookups.shift()!.resolve(response('pending')));
    expect(fixture.result.current.loading).toBe(true);
    expect(supersessions()).toHaveLength(0);
    await tick();
    await flush(() => fixture.lookups.shift()!.resolve(response('pending', newerIdentity)));
    expect(fixture.result.current.loading).toBe(false);
    expect(supersessions()).toHaveLength(1);
    expect(successes()).toHaveLength(0);
  });

  it.each(['mutation', 'lookup'])(
    'recovers a current retry %s failure after A was replaced by failed B',
    async stage => {
      const fixture = await setupWaiting();
      await tick();
      await flush(() => fixture.lookups.shift()!.resolve(response('failed', newerIdentity)));
      expect(supersessions()).toHaveLength(1);
      vi.mocked(notifications.show).mockClear();
      const failed = await retry(fixture.result);
      if (stage === 'mutation') {
        await flush(() => fixture.retries.shift()!.reject());
      } else {
        await flush(() => fixture.retries.shift()!.resolve(response('pending', newerIdentity)));
        await flush(() => fixture.lookups.shift()!.reject());
      }
      await act(async () => {
        await failed.pending;
      });
      expect(fixture.result.current.loading).toBe(false);
      expect(fixture.result.current.error).toBe(stage === 'mutation' ? 'retry network failed' : 'fresh lookup failed');
      expect(notifications.show).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ color: 'red' }));
      expect(successes()).toHaveLength(0);
      const recovered = await retry(fixture.result);
      await flush(() => fixture.retries.shift()!.resolve(response('pending', newerIdentity)));
      await flush(() => fixture.lookups.shift()!.resolve(response('pending', newerIdentity)));
      await act(async () => {
        await recovered.pending;
      });
      expect(fixture.result.current.loading).toBe(true);
      await tick();
      await flush(() => fixture.lookups.shift()!.resolve(response('completed', newerIdentity)));
      expect(fixture.result.current.loading).toBe(false);
      expect(successes()).toHaveLength(1);
      expect(supersessions()).toHaveLength(0);
      await tick(3000);
      expect(fixture.lookups).toHaveLength(0);
      expect(successes()).toHaveLength(1);
    }
  );

  it.each(['route', 'return', 'index', 'retry', 'unmount'])(
    'rejects a superseding lookup belonging to A after %s invalidates its authority',
    async transition => {
      const fixture = await setupWaiting();
      await tick();
      const stale = fixture.lookups.shift()!;
      let current: { pending: Promise<void> } | undefined;
      if (transition === 'route' || transition === 'return') {
        fixture.rerender({ slug: 'other' });
        await flush(() =>
          fixture.lookups.shift()!.resolve(response('pending', { productId: 'product-B', intentId: 'B' }))
        );
        if (transition === 'return') {
          fixture.rerender({ slug: 'sample' });
          await flush(() => fixture.lookups.shift()!.resolve(response('pending')));
        }
      } else if (transition === 'index') {
        current = await reserve(fixture.result);
      } else if (transition === 'retry') {
        current = await retry(fixture.result);
        await flush(() => fixture.retries.shift()!.resolve());
      } else {
        fixture.unmount();
      }
      vi.mocked(notifications.show).mockClear();
      await flush(() => stale.resolve(response('completed', newerIdentity)));
      expect(supersessions()).toHaveLength(0);
      expect(successes()).toHaveLength(0);
      if (current) {
        await flush(() => fixture.lookups.shift()!.resolve(response('pending')));
        await act(async () => {
          await current!.pending;
        });
        expect(fixture.result.current.loading).toBe(true);
        expect(supersessions()).toHaveLength(0);
        await tick();
        await flush(() => fixture.lookups.shift()!.resolve(response()));
        expect(successes()).toHaveLength(1);
      } else if (transition !== 'unmount') {
        expect(fixture.result.current.loading).toBe(false);
      }
    }
  );

  it.each(['completed', 'failed', 'superseded'])(
    'stops idle polling after an initial terminal %s status without an owned request',
    async status => {
      const fixture = setup();
      await flush(() => fixture.lookups.shift()!.resolve(response(status)));
      expect(fixture.result.current.loading).toBe(false);
      await tick(5000);
      expect(fixture.lookups).toHaveLength(0);
      expect(notifications.show).not.toHaveBeenCalled();
    }
  );

  it('does not start polling while the initial lookup is unanswered', async () => {
    const fixture = setup();
    await tick(5000);
    expect(fixture.lookups).toHaveLength(1);
  });

  it('does not reschedule polling after an initial lookup failure without intents', async () => {
    const fixture = setup();
    await flush(() => fixture.lookups.shift()!.reject());
    expect(fixture.result.current.error).toBe('fresh lookup failed');
    await tick(5000);
    expect(fixture.lookups).toHaveLength(0);
    expect(notifications.show).not.toHaveBeenCalled();
  });

  it('stops idle polling when neither search nor translation intent is required', async () => {
    const fixture = setup();
    const notRequired: ProductContentSyncStatusOnIndexProductButtonQuery = {
      productContentSyncStatus: { ...response('not_required').productContentSyncStatus, searchIntent: null },
    };
    await flush(() => fixture.lookups.shift()!.resolve(notRequired));
    expect(fixture.result.current.loading).toBe(false);
    await tick(5000);
    expect(fixture.lookups).toHaveLength(0);
  });

  it.each(['search', 'translation'])(
    'observes an externally running %s intent and stops once both intents are terminal',
    async kind => {
      const fixture = setup();
      const running = (status: string) =>
        kind === 'search' ? response(status) : response('completed', undefined, { status });
      await flush(() => fixture.lookups.shift()!.resolve(running('pending')));
      expect(fixture.result.current.loading).toBe(false);
      expect(notifications.show).not.toHaveBeenCalled();
      await tick();
      expect(fixture.lookups).toHaveLength(1);
      await flush(() => fixture.lookups.shift()!.resolve(running('in_progress')));
      await tick();
      expect(fixture.lookups).toHaveLength(1);
      await flush(() => fixture.lookups.shift()!.resolve(response()));
      await tick(5000);
      expect(fixture.lookups).toHaveLength(0);
      expect(fixture.result.current.loading).toBe(false);
      expect(notifications.show).not.toHaveBeenCalled();
    }
  );

  it('resumes observation when an ownerless retry returns the search intent to pending', async () => {
    const fixture = setup();
    await flush(() => fixture.lookups.shift()!.resolve(response('failed')));
    expect(fixture.result.current.syncStatus?.searchStatus).toBe('failed');
    await tick(3000);
    expect(fixture.lookups).toHaveLength(0);
    const retryAction = await retry(fixture.result);
    await flush(() => fixture.retries.shift()!.resolve(response('pending')));
    await flush(() => fixture.lookups.shift()!.resolve(response('pending')));
    await act(async () => {
      await retryAction.pending;
    });
    expect(fixture.result.current.loading).toBe(false);
    expect(notifications.show).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ color: 'blue' }));
    expect(successes()).toHaveLength(0);
    await tick();
    expect(fixture.lookups).toHaveLength(1);
    await flush(() => fixture.lookups.shift()!.resolve(response()));
    expect(fixture.result.current.loading).toBe(false);
    expect(successes()).toHaveLength(0);
    await tick(3000);
    expect(fixture.lookups).toHaveLength(0);
  });

  it('stops observing an externally running intent after a route move and rejects its late response', async () => {
    const fixture = setup();
    await flush(() => fixture.lookups.shift()!.resolve(response('pending')));
    await tick();
    const stale = fixture.lookups.shift()!;
    fixture.rerender({ slug: 'other' });
    await flush(() =>
      fixture.lookups.shift()!.resolve(response('completed', { productId: 'product-B', intentId: 'B' }))
    );
    await tick(3000);
    expect(fixture.lookups).toHaveLength(0);
    await flush(() => stale.resolve(response('completed')));
    expect(fixture.lookups).toHaveLength(0);
    expect(fixture.result.current.syncStatus?.searchIntent?.intentId).toBe('B');
    expect(notifications.show).not.toHaveBeenCalled();
    expect(fixture.result.current.loading).toBe(false);
  });
});
