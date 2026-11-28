import type { ApolloClient } from '@apollo/client';

const pendingByClient = new WeakMap<ApolloClient, Map<string, Promise<unknown>>>();

export function queueProductScreenshotRefresh<T>(client: ApolloClient, slug: string, refresh: () => Promise<T>) {
  const pending = pendingByClient.get(client) ?? new Map<string, Promise<unknown>>();
  pendingByClient.set(client, pending);

  // Retained reads from a previous route can still write the same cache entry.
  const request = (pending.get(slug) ?? Promise.resolve()).catch(() => {}).then(refresh);
  pending.set(slug, request);

  const clear = () => {
    if (pending.get(slug) === request) pending.delete(slug);
  };
  void request.then(clear, clear);
  return request;
}
