import { gql } from '@apollo/client';
import { useApolloClient, useQuery } from '@apollo/client/react';
import { ProductVoteCountDocument } from '@darun/provider-graphql';
import { useLocale } from 'next-intl';
import { useRef, useState } from 'react';

void gql`
  query ProductVoteCount($slug: String!, $locale: String!) {
    productBySlug(slug: $slug, locale: $locale) {
      id
      voteCount
    }
  }
`;

export function useProductVoteCount(slug: string, count: number | null | undefined) {
  const locale = useLocale();
  const client = useApolloClient();
  const { data: cached } = useQuery(ProductVoteCountDocument, {
    variables: { slug, locale },
    fetchPolicy: 'cache-only',
  });
  const cachedCount = cached?.productBySlug === null ? null : cached?.productBySlug?.voteCount;
  const identity = `${locale}:${slug}`;
  const [read, setRead] = useState({
    identity: { key: identity },
    received: count,
    receivedCache: cachedCount,
    count,
    unavailable: count === null,
    loading: false,
  });
  const pending = useRef(new Set<object>());
  if (read.identity.key !== identity) {
    setRead({
      identity: { key: identity },
      received: count,
      receivedCache: cachedCount,
      count,
      unavailable: count === null,
      loading: false,
    });
  } else if (read.received !== count) {
    setRead({
      ...read,
      received: count,
      receivedCache: cachedCount,
      count: count ?? read.count,
      unavailable: count === null,
    });
  } else if (read.receivedCache !== cachedCount) {
    setRead({
      ...read,
      receivedCache: cachedCount,
      count: cachedCount ?? read.count,
      unavailable: cachedCount === undefined ? read.unavailable : cachedCount === null,
    });
  }
  const current = read.identity.key === identity ? read : { count, unavailable: count === null, loading: false };

  const retry = async () => {
    const requestIdentity = read.identity;
    if (pending.current.has(requestIdentity)) return;
    pending.current.add(requestIdentity);
    setRead(previous => ({ ...previous, loading: true }));
    let next: number | null = null;
    try {
      const result = await client.query({
        query: ProductVoteCountDocument,
        variables: { slug, locale },
        fetchPolicy: 'network-only',
      });
      next = result.data?.productBySlug?.voteCount ?? null;
    } catch {
      // A failed read keeps the last successful count and the retry control.
    } finally {
      pending.current.delete(requestIdentity);
      setRead(previous =>
        previous.identity === requestIdentity
          ? {
              ...previous,
              count: next ?? previous.count,
              unavailable: next === null,
              loading: false,
            }
          : previous
      );
    }
  };

  return {
    count: current.count,
    unavailable: current.unavailable,
    loading: current.loading,
    retry,
  };
}
