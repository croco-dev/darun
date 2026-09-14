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
  });
});
