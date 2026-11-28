import type { ApolloClient } from '@apollo/client';

const pendingByClient = new WeakMap<ApolloClient, Map<string, Promise<unknown>>>();

export function queueProductScreenshotRefresh<T>(
  client: ApolloClient,
  slug: string,
  refresh: () => Promise<T>,
  savedProductId?: string
) {
  const pending = pendingByClient.get(client) ?? new Map<string, Promise<unknown>>();
  pendingByClient.set(client, pending);

  // Retained reads from a previous route can still write the same cache entry.
  const request = (pending.get(slug) ?? Promise.resolve())
    .catch(() => {})
    .then(refresh)
    .catch(error => {
      // A committed change can leave a complete but obsolete gallery in cache.
      const id = savedProductId && client.cache.identify({ __typename: 'Product', id: savedProductId });
      if (id) {
        client.cache.batch({
          update(cache) {
            cache.evict({ id, fieldName: 'screenshots' });
            cache.evict({ id, fieldName: 'coverScreenshot' });
          },
        });
      }
      throw error;
    });
  pending.set(slug, request);

  const clear = () => {
    if (pending.get(slug) === request) pending.delete(slug);
  };
  void request.then(clear, clear);
  return request;
}
