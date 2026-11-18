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
type DescriptionRead = Promise<DescriptionResult | undefined>;
type DescriptionRequests = {
  publication?: { sequence: number; source: 'read' | 'save' };
  pending?: DescriptionRead;
};

const requestsByClient = new WeakMap<ApolloClient, Map<string, DescriptionRequests>>();
let requestCount = 0;

function requestsFor(client: ApolloClient, slug: string) {
  let products = requestsByClient.get(client);
  if (!products) {
    products = new Map();
    requestsByClient.set(client, products);
  }
  let requests = products.get(slug);
  if (!requests) {
    requests = {};
    products.set(slug, requests);
  }
  return requests;
}

export function beginProductDescriptionSave(client: ApolloClient, slug: string) {
  const requests = requestsFor(client, slug);
  const request = ++requestCount;
  const query = TempProductBySlugOnEditProductDescriptionDocument;
  const variables = { slug };
  return (product: DescriptionProduct) => {
    const current = client.readQuery({ query, variables })?.tempProductBySlug;
    if ((requests.publication && requests.publication.sequence > request) || (current && current.id !== product.id)) {
      // An older command response cannot establish what the server holds now.
      void readSavedProductDescription(client, slug, query, true).catch(() => {});
      return;
    }
    requests.pending = undefined;
    requests.publication = { sequence: ++requestCount, source: 'save' };
    const savedProduct = { ...product, __typename: 'Product' };
    client.writeQuery({ query, variables, data: { tempProductBySlug: savedProduct } });
  };
}

export function readSavedProductDescription(
  client: ApolloClient,
  slug: string,
  query: DescriptionQuery,
  fresh = false
) {
  const requests = requestsFor(client, slug);
  if (requests.pending && !fresh) return requests.pending;

  const request = ++requestCount;
  const variables = { slug };
  const supersedingResult = async () => {
    if (!fresh) return undefined;
    if (requests.pending) await requests.pending;
    const publication = requests.publication;
    if (!publication || publication.sequence <= request) return undefined;
    if (publication.source === 'save') {
      // The delayed read might precede or follow the actual commit. Read again after its acknowledgement.
      return readSavedProductDescription(client, slug, query, true);
    }
    return client.readQuery({ query, variables }) ?? undefined;
  };
  const read: DescriptionRead = client
    .query({ query, variables, fetchPolicy: 'no-cache', context: { queryDeduplication: false } })
    .then(
      ({ data }) => {
        // A confirmed save or an independent conflict read supersedes older requests for this slug.
        if (requests.pending !== read) return supersedingResult();
        if (data) {
          requests.publication = { sequence: ++requestCount, source: 'read' };
          client.writeQuery({ query, variables, data });
        }
        return data;
      },
      (error: unknown) => {
        if (requests.pending === read) throw error;
        return supersedingResult();
      }
    )
    .finally(() => {
      if (requests.pending === read) requests.pending = undefined;
    });
  requests.pending = read;
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
