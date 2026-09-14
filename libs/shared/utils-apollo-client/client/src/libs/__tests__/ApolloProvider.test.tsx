import { ApolloClient, ApolloLink, gql, InMemoryCache, Observable } from '@apollo/client';
import { render } from '@testing-library/react';
import type { Cookies } from 'next-client-cookies';
import React, { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { ApolloProvider } from '../ApolloProvider';

interface ChainedLink {
  left?: ChainedLink;
  right?: ChainedLink;
}

function countLinks(link: ChainedLink | undefined): number {
  if (!link) return 0;
  if (link.left || link.right) {
    return countLinks(link.left) + countLinks(link.right);
  }
  return 1;
}

function createMockCookies(getToken: () => string): Cookies {
  return {
    get: ((name?: string) => {
      if (name) {
        return name === 'idToken' ? getToken() : undefined;
      }
      return { idToken: getToken() };
    }) as Cookies['get'],
    set: () => {},
    remove: () => {},
  };
}

const TEST_QUERY = gql`
  query TestOp {
    probe
  }
`;

describe('ApolloProvider', () => {
  it('attaches authLink to client on mount', () => {
    const baseLink = new ApolloLink((op, forward) => forward(op));
    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: baseLink,
    });

    const mockCookies = createMockCookies(() => 'test-token');

    const initialLinkCount = countLinks(client.link as ChainedLink);
    expect(initialLinkCount).toBe(1);

    render(
      <ApolloProvider makeClient={() => client} cookies={mockCookies}>
        <div>Child</div>
      </ApolloProvider>
    );

    const postMountLinkCount = countLinks(client.link as ChainedLink);
    expect(postMountLinkCount).toBe(2);
  });

  it('does not duplicate authLink on multiple mounts or re-renders with the same client instance', () => {
    const baseLink = new ApolloLink((op, forward) => forward(op));
    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: baseLink,
    });

    const mockCookies = createMockCookies(() => 'test-token');

    const { rerender } = render(
      <ApolloProvider makeClient={() => client} cookies={mockCookies}>
        <div>First Render</div>
      </ApolloProvider>
    );

    const firstCount = countLinks(client.link as ChainedLink);
    expect(firstCount).toBe(2);

    // Re-render
    rerender(
      <ApolloProvider makeClient={() => client} cookies={mockCookies}>
        <div>Second Render</div>
      </ApolloProvider>
    );

    const secondCount = countLinks(client.link as ChainedLink);
    expect(secondCount).toBe(2);

    // Mount again with the same client instance
    render(
      <ApolloProvider makeClient={() => client} cookies={mockCookies}>
        <div>Another Tree</div>
      </ApolloProvider>
    );

    const thirdCount = countLinks(client.link as ChainedLink);
    expect(thirdCount).toBe(2);
  });

  it('reads current cookies even when cookies reference changes dynamically', async () => {
    let capturedHeaders: Record<string, string> = {};

    const terminatingLink = new ApolloLink(operation => {
      capturedHeaders = operation.getContext().headers;
      return new Observable(observer => {
        observer.next({ data: null });
        observer.complete();
      });
    });

    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: terminatingLink,
    });

    function TestHost() {
      const [token, setToken] = useState('token-v1');
      // On each render, a new cookies instance with its own scoped closure is created
      const scopedCookies = createMockCookies(() => token);

      return (
        <ApolloProvider makeClient={() => client} cookies={scopedCookies}>
          <button type="button" onClick={() => setToken('token-v2')}>
            Update
          </button>
        </ApolloProvider>
      );
    }

    const { getByText } = render(<TestHost />);

    await new Promise<void>(resolve => {
      ApolloLink.execute(client.link, { query: TEST_QUERY }, { client }).subscribe({
        next: () => {},
        complete: () => resolve(),
      });
    });

    expect(capturedHeaders['Authorization']).toBe('Bearer token-v1');

    // Token changes and component re-renders with a brand-new cookies object reference
    getByText('Update').click();

    await new Promise<void>(resolve => {
      ApolloLink.execute(client.link, { query: TEST_QUERY }, { client }).subscribe({
        next: () => {},
        complete: () => resolve(),
      });
    });

    expect(capturedHeaders['Authorization']).toBe('Bearer token-v2');
  });

  it('omits Authorization header when unauthenticated or token is missing', async () => {
    let capturedHeaders: Record<string, string> = {};

    const terminatingLink = new ApolloLink(operation => {
      capturedHeaders = operation.getContext().headers;
      return new Observable(observer => {
        observer.next({ data: null });
        observer.complete();
      });
    });

    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: terminatingLink,
    });

    const mockCookies = createMockCookies(() => '');

    render(
      <ApolloProvider makeClient={() => client} cookies={mockCookies}>
        <div>Unauthenticated</div>
      </ApolloProvider>
    );

    await new Promise<void>(resolve => {
      ApolloLink.execute(client.link, { query: TEST_QUERY }, { client }).subscribe({
        next: () => {},
        complete: () => resolve(),
      });
    });

    expect(capturedHeaders['Authorization']).toBeUndefined();
  });
});
