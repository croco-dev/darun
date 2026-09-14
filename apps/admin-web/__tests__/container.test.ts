import { describe, expect, it } from 'vitest';
import { container, createAuthService, shouldRetryOperation } from '../app/container';

describe('admin-web container', () => {
  it('container exports stable singleton instances', () => {
    expect(container.authService).toBe(container.authService);
    expect(container.httpLink).toBe(container.httpLink);
    expect(container.apolloClient).toBe(container.apolloClient);
  });

  it('createAuthService returns a fresh instance on each call', () => {
    const first = createAuthService();
    const second = createAuthService();

    expect(first).not.toBe(second);
    expect(first).not.toBe(container.authService);
  });

  it('apolloClient RetryLink does not retry mutation operations', () => {
    expect.hasAssertions();

    const mutationOp = {
      query: {
        definitions: [{ kind: 'OperationDefinition', operation: 'mutation' }],
      },
    };
    const mutationWithFragmentOp = {
      query: {
        definitions: [
          { kind: 'FragmentDefinition', operation: undefined },
          { kind: 'OperationDefinition', operation: 'mutation' },
        ],
      },
    };
    const queryOp = {
      query: {
        definitions: [{ kind: 'OperationDefinition', operation: 'query' }],
      },
    };

    expect(shouldRetryOperation(new Error('Network error'), mutationOp)).toBe(false);
    expect(shouldRetryOperation(new Error('Network error'), mutationWithFragmentOp)).toBe(false);
    expect(shouldRetryOperation(new Error('Network error'), queryOp)).toBe(true);
    expect(shouldRetryOperation(null, queryOp)).toBe(false);

    // Timeout and abort error checks
    expect(shouldRetryOperation(new Error('operation timed out after 15000ms'), queryOp)).toBe(false);
    expect(shouldRetryOperation({ name: 'TimeoutError' }, queryOp)).toBe(false);
    expect(shouldRetryOperation({ name: 'AbortError' }, queryOp)).toBe(false);

    interface ChainedLink {
      left?: ChainedLink;
      right?: ChainedLink;
      retryIf?: (count: number, operation: unknown, error: unknown) => boolean | Promise<boolean>;
    }

    const findRetryLink = (link: ChainedLink | undefined): ChainedLink | undefined => {
      if (!link) return undefined;
      if (typeof link.retryIf === 'function') {
        return link;
      }
      return findRetryLink(link.left) || findRetryLink(link.right);
    };

    const retryLink = findRetryLink(container.apolloClient.link as ChainedLink);
    expect(retryLink).toBeDefined();
    expect(retryLink?.retryIf?.(1, mutationOp, new Error('Network error'))).toBe(false);
    expect(retryLink?.retryIf?.(1, mutationWithFragmentOp, new Error('Network error'))).toBe(false);
    expect(retryLink?.retryIf?.(1, queryOp, new Error('Network error'))).toBe(true);
    expect(retryLink?.retryIf?.(1, queryOp, { name: 'TimeoutError' })).toBe(false);
    expect(retryLink?.retryIf?.(1, queryOp, { name: 'AbortError' })).toBe(false);
  });

  it('includes createTimeoutLink in the Apollo Client link chain', () => {
    interface ChainedLink {
      left?: ChainedLink;
      right?: ChainedLink;
      request?: (operation: unknown, forward: unknown) => unknown;
    }

    const collectLinks = (link: ChainedLink | undefined): ChainedLink[] => {
      if (!link) return [];
      if (link.left || link.right) {
        return [...collectLinks(link.left), ...collectLinks(link.right)];
      }
      return [link];
    };

    const links = collectLinks(container.apolloClient.link as ChainedLink);
    expect(links.length).toBeGreaterThanOrEqual(4);

    let foundTimeoutLink = false;
    for (const link of links) {
      if (typeof link.request === 'function') {
        const fakeOp = {
          getContext: () => ({ timeout: 100 }),
          setContext: (ctx: { fetchOptions?: { signal?: unknown }; __darunOriginalSignal?: unknown }) => {
            if (ctx.fetchOptions?.signal || ctx.__darunOriginalSignal !== undefined) {
              foundTimeoutLink = true;
            }
          },
          operationName: 'ProbeTimeout',
        };
        const fakeForward = () => ({
          subscribe: () => ({ unsubscribe: () => {} }),
        });
        try {
          const obs = link.request(fakeOp, fakeForward) as { subscribe?: (observer: unknown) => unknown } | undefined;
          obs?.subscribe?.({});
        } catch {
          // ignore potential errors from other link types
        }
      }
    }

    expect(foundTimeoutLink).toBe(true);
  });
});
