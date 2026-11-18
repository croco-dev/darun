'use client';

import type { ApolloClient } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import {
  TempProductBySlugOnEditProductDescriptionDocument,
  type TempProductBySlugOnEditProductDescriptionQuery,
} from '@darun/provider-graphql';
import { useCallback, useEffect, useRef, useState } from 'react';

type DescriptionResult = TempProductBySlugOnEditProductDescriptionQuery;
type DescriptionProduct = NonNullable<DescriptionResult['tempProductBySlug']>;
type DescriptionQuery = typeof TempProductBySlugOnEditProductDescriptionDocument;

const pendingReads = new WeakMap<ApolloClient, Map<string, Promise<DescriptionResult | undefined>>>();

export function storeSavedProductDescription(client: ApolloClient, slug: string, product: DescriptionProduct) {
  pendingReads.get(client)?.delete(slug);
  const savedProduct = { ...product, __typename: 'Product' };
  client.writeQuery({
    query: TempProductBySlugOnEditProductDescriptionDocument,
    variables: { slug },
    data: { tempProductBySlug: savedProduct },
  });
}

export function readSavedProductDescription(
  client: ApolloClient,
  slug: string,
  query: DescriptionQuery,
  fresh = false
) {
  let reads = pendingReads.get(client);
  if (!reads) {
    reads = new Map();
    pendingReads.set(client, reads);
  }
  const pending = reads.get(slug);
  if (pending && !fresh) return pending;

  const active = reads;
  const variables = { slug };
  const read = client
    .query({ query, variables, fetchPolicy: 'no-cache', context: { queryDeduplication: false } })
    .then(
      ({ data }) => {
        // A confirmed save or an independent conflict read supersedes older requests for this slug.
        if (active.get(slug) === read && data) client.writeQuery({ query, variables, data });
        return data;
      },
      (error: unknown) => {
        if (active.get(slug) === read || fresh) throw error;
        return undefined;
      }
    )
    .finally(() => {
      if (active.get(slug) === read) active.delete(slug);
    });
  active.set(slug, read);
  return read;
}

export function useSavedProductDescription(query: DescriptionQuery, slug: string) {
  const { client, data, error: cacheError } = useQuery(query, { variables: { slug }, fetchPolicy: 'cache-only' });
  const [failure, setFailure] = useState<{ slug: string; error: Error }>();
  const latestAttempt = useRef(0);

  const load = useCallback(async () => {
    const attempt = ++latestAttempt.current;
    try {
      await readSavedProductDescription(client, slug, query);
    } catch (error) {
      if (attempt === latestAttempt.current) {
        setFailure({ slug, error: error instanceof Error ? error : new Error('설명을 불러오지 못했습니다.') });
      }
    }
  }, [client, slug, query]);

  useEffect(() => {
    if (!data && !cacheError) void load();
  }, [data, cacheError, load]);

  const error = cacheError ?? (!data && failure?.slug === slug ? failure.error : undefined);
  const refetch = () => {
    setFailure(undefined);
    return load();
  };
  return { client, data, error, loading: !data && !error, refetch };
}
