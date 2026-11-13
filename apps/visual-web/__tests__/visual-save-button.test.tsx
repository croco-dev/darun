// @vitest-environment jsdom
import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client/core';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VisualSaveButton } from '../features/saves/VisualSaveButton';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const auth = vi.hoisted(() => ({
  observers: new Set<(user: { id: string } | null) => void>(),
}));
vi.mock('@darun/provider-auth/client', () => ({
  useAuthService: () => authService,
  useAuthState: () => ({ isLoading: false, isError: false }),
}));
vi.mock('@apollo/client/react', () => ({ useApolloClient: () => client }));
vi.mock('@darun/utils-router', () => ({ useNavigate: () => vi.fn() }));
const authService = {
  onIdTokenChanged: (observer: (user: { id: string } | null) => void) => {
    auth.observers.add(observer);
    return () => auth.observers.delete(observer);
  },
};
type Request = {
  operation: string;
  variables: Record<string, unknown>;
  respond: (saved: boolean | null) => void;
  fail: () => void;
  reject: (code: string, message: string) => void;
};
let client: ApolloClient;
let root: Root;
let host: HTMLDivElement;
let requests: Request[];
let props: { kind: 'screenshot' | 'flow'; id: string; enabled: boolean };
const button = () => host.querySelector<HTMLButtonElement>('button')!;
const render = async () => act(async () => root.render(createElement(VisualSaveButton, props)));
const signIn = async (id: string | null) =>
  act(async () => auth.observers.forEach(observer => observer(id ? { id } : null)));

beforeEach(() => {
  requests = [];
  client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      operation =>
        new Observable(observer => {
          const name = operation.operationName!;
          const field = name[0].toLowerCase() + name.slice(1);
          requests.push({
            operation: name,
            variables: operation.variables,
            respond: saved => {
              observer.next({
                data: { [field]: saved === null ? null : { saved } },
              });
              observer.complete();
            },
            fail: () => observer.error(new Error('status unavailable')),
            reject: (code, message) => {
              observer.next({ errors: [{ message, extensions: { code } }] });
              observer.complete();
            },
          });
        })
    ),
  });
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  props = { kind: 'screenshot', id: 'screen-A', enabled: true };
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(async () => {
  await act(async () => root.unmount());
  client.stop();
  host.remove();
  auth.observers.clear();
  vi.restoreAllMocks();
});

describe.each(['screenshot', 'flow'] as const)('%s save readiness', kind => {
  it.each([false, true])('waits for known saved=%s before choosing the opposite target', async initialSaved => {
    props.kind = kind;
    await render();
    expect(button().disabled).toBe(true);
    expect(button().hasAttribute('aria-pressed')).toBe(false);
    await signIn('account-A');
    expect(button().textContent).toContain('저장 상태 확인 중');
    expect(button().disabled).toBe(true);
    await act(async () => button().click());
    expect(requests).toHaveLength(1);
    await act(async () => requests[0].respond(initialSaved));
    expect(button().disabled).toBe(false);
    expect(button().getAttribute('aria-pressed')).toBe(String(initialSaved));
    await act(async () => button().click());
    expect(requests[1].variables).toEqual({
      input: { id: props.id, saved: !initialSaved },
    });
    await act(async () => requests[1].respond(!initialSaved));
    expect(button().getAttribute('aria-pressed')).toBe(String(!initialSaved));
  });

  it('recovers a failed status query without writing, then saves from the recovered state', async () => {
    props.kind = kind;
    await render();
    await signIn('account-A');
    await act(async () => requests[0].fail());
    expect(host.querySelector('[role=alert]')?.textContent).toContain('저장 상태를 확인하지 못했어요');
    expect(button().disabled).toBe(true);
    expect(button().hasAttribute('aria-pressed')).toBe(false);
    const retry = [...host.querySelectorAll('button')].find(item => item.textContent === '다시 확인')!;
    await act(async () => retry.click());
    expect(requests.map(request => request.operation)).toEqual([
      kind === 'screenshot' ? 'VisualScreenshotSaveStatus' : 'VisualFlowSaveStatus',
      kind === 'screenshot' ? 'VisualScreenshotSaveStatus' : 'VisualFlowSaveStatus',
    ]);
    expect(button().disabled).toBe(true);
    await act(async () => requests[1].respond(true));
    expect(host.querySelector('[role=alert]')).toBeNull();
    expect(button().getAttribute('aria-pressed')).toBe('true');
    await act(async () => button().click());
    expect(requests[2].variables).toEqual({
      input: { id: props.id, saved: false },
    });
    await act(async () => requests[2].respond(false));
    expect(button().getAttribute('aria-pressed')).toBe('false');
  });

  it('waits again when an unavailable target becomes enabled', async () => {
    props = { ...props, kind, enabled: false };
    await render();
    await signIn('account-A');
    expect(requests).toHaveLength(0);
    expect(button().disabled).toBe(true);
    props = { ...props, enabled: true };
    await render();
    expect(button().disabled).toBe(true);
    await act(async () => requests[0].respond(false));
    expect(button().disabled).toBe(false);
  });

  it('does not treat an absent status as a confirmed unsaved item', async () => {
    props.kind = kind;
    await render();
    await signIn('account-A');
    await act(async () => requests[0].respond(null));
    expect(host.querySelector('[role=alert]')).not.toBeNull();
    expect(button().disabled).toBe(true);
    expect(button().hasAttribute('aria-pressed')).toBe(false);
  });

  it('ignores stale status responses when the account or target changes', async () => {
    props.kind = kind;
    await render();
    await signIn('account-A');
    await signIn('account-B');
    expect(button().disabled).toBe(true);
    await act(async () => requests[1].respond(true));
    await act(async () => button().click());
    await act(async () => requests[2].respond(false));
    await act(async () => requests[0].respond(true));
    expect(button().getAttribute('aria-pressed')).toBe('false');
    props = { ...props, id: 'target-B' };
    await render();
    expect(button().disabled).toBe(true);
    expect(button().hasAttribute('aria-pressed')).toBe(false);
    await act(async () => requests[3].respond(false));
    await act(async () => button().click());
    expect(requests[4].variables).toEqual({
      input: { id: 'target-B', saved: true },
    });
    await act(async () => requests[4].respond(true));
    await signIn(null);
    expect(host.textContent).toContain('로그인');
  });
});

describe.each(['screenshot', 'flow'] as const)('%s session recovery', kind => {
  it.each(['status', 'mutation'] as const)('offers login after an Apollo authentication error in %s', async phase => {
    props.kind = kind;
    await render();
    await signIn('account-A');
    if (phase === 'mutation') {
      await act(async () => requests[0].respond(false));
      await act(async () => button().click());
    }
    await act(async () => requests.at(-1)!.reject('UNAUTHENTICATED', '세션을 다시 확인해 주세요.'));
    expect(button().textContent).toContain('Google로 로그인');
    expect(host.querySelector('[role=alert]')).toBeNull();
    const requestCount = requests.length;
    // Firebase can refresh the token without changing the account ID or route.
    await signIn('account-A');
    expect(requests).toHaveLength(requestCount + 1);
    expect(requests.at(-1)!.operation).toBe(
      kind === 'screenshot' ? 'VisualScreenshotSaveStatus' : 'VisualFlowSaveStatus'
    );
    expect(requests.at(-1)!.variables).toEqual({ id: props.id });
    await act(async () => requests.at(-1)!.respond(true));
    expect(button().getAttribute('aria-pressed')).toBe('true');
    expect(button().textContent).toContain('계정에 저장됨');
  });

  it('keeps signed-out token events in the login state without querying', async () => {
    props.kind = kind;
    await render();
    await signIn(null);
    await signIn(null);
    expect(button().textContent).toContain('Google로 로그인');
    expect(requests).toHaveLength(0);
  });

  it.each(['network', 'graphql'] as const)(
    'offers ordinary status recovery after reauthentication and a %s error',
    async failure => {
      props.kind = kind;
      await render();
      await signIn('account-A');
      await act(async () => requests[0].reject('UNAUTHENTICATED', 'Session expired'));
      await signIn('account-A');
      await act(async () => {
        if (failure === 'network') requests[1].fail();
        else requests[1].reject('INTERNAL_SERVER_ERROR', 'Status unavailable');
      });
      expect(host.textContent).not.toContain('Google로 로그인');
      expect(host.querySelector('[role=alert]')?.textContent).toContain('저장 상태를 확인하지 못했어요');
      const retry = [...host.querySelectorAll('button')].find(item => item.textContent === '다시 확인')!;
      await act(async () => retry.click());
      expect(requests).toHaveLength(3);
      expect(requests[2].variables).toEqual({ id: props.id });
      await act(async () => requests[2].respond(false));
      expect(button().getAttribute('aria-pressed')).toBe('false');
    }
  );

  it.each(['status', 'mutation'] as const)(
    'keeps non-authentication GraphQL errors in the %s retry path',
    async phase => {
      props.kind = kind;
      await render();
      await signIn('account-A');
      if (phase === 'mutation') {
        await act(async () => requests[0].respond(false));
        await act(async () => button().click());
      }
      await act(async () => requests.at(-1)!.reject('INTERNAL_SERVER_ERROR', 'UNAUTHENTICATED'));
      expect(host.textContent).not.toContain('Google로 로그인');
      expect(host.querySelector('[role=alert]')?.textContent).toContain(
        phase === 'status' ? '저장 상태를 확인하지 못했어요' : '저장에 실패했어요'
      );
      const retry = [...host.querySelectorAll('button')].find(
        item => item.textContent === (phase === 'status' ? '다시 확인' : '다시 시도')
      )!;
      await act(async () => retry.click());
      expect(requests.at(-1)!.variables).toEqual(
        phase === 'status' ? { id: props.id } : { input: { id: props.id, saved: true } }
      );
      await act(async () => requests.at(-1)!.respond(true));
      expect(button().getAttribute('aria-pressed')).toBe('true');
    }
  );
});
