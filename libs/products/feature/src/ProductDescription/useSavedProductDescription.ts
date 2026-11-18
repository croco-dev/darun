'use client';

import { makeVar, type ApolloClient, type ReactiveVar } from '@apollo/client';
import { useQuery, useReactiveVar } from '@apollo/client/react';
import {
  TempProductBySlugOnEditProductDescriptionDocument,
  type TempProductBySlugOnEditProductDescriptionQuery,
} from '@darun/provider-graphql';
import { useCallback, useEffect, useRef, useState } from 'react';

type DescriptionResult = TempProductBySlugOnEditProductDescriptionQuery;
type DescriptionProduct = NonNullable<DescriptionResult['tempProductBySlug']>;
type DescriptionQuery = typeof TempProductBySlugOnEditProductDescriptionDocument;
type DescriptionRead = Promise<DescriptionResult | undefined>;
type ReadPurpose = 'load' | 'conflict' | 'verify';
type Verification = { status: 'loading' } | { status: 'failed'; error: Error };
type DescriptionRequests = {
  publication?: { sequence: number; source: 'read' | 'save' };
  authority?: { sequence: number; source: 'conflict' | 'save' };
  pending?: DescriptionRead;
  verification: ReactiveVar<Verification | undefined>;
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
    requests = { verification: makeVar<Verification | undefined>(undefined) };
    products.set(slug, requests);
  }
  return requests;
}

function descriptionReadError(error: unknown) {
  return error instanceof Error ? error : new Error('설명을 불러오지 못했습니다.');
}

export function beginProductDescriptionSave(client: ApolloClient, slug: string) {
  const requests = requestsFor(client, slug);
  const request = ++requestCount;
  const query = TempProductBySlugOnEditProductDescriptionDocument;
  const variables = { slug };
  return (product: DescriptionProduct) => {
    const current = client.readQuery({ query, variables })?.tempProductBySlug;
    const publication = requests.publication;
    const authority = requests.authority;
    const overlappingRead = publication?.source === 'read' && publication.sequence > request;
    const superseded = authority && authority.sequence > request;
    const verify = () => readSavedProductDescription(client, slug, query, 'verify');

    if (superseded || (current && current.id !== product.id)) {
      // When a conflict read and a save disagree, confirm the current value before offering it to the editor.
      if (authority?.source === 'conflict' && current?.description !== product.description) {
        requests.verification({ status: 'loading' });
      }
      void verify().catch(() => {});
      return current?.id === product.id ? current : product;
    }
    const publishSave = () => {
      requests.pending = undefined;
      const saved = { sequence: ++requestCount, source: 'save' } as const;
      requests.publication = saved;
      requests.authority = saved;
      const savedProduct = { ...product, __typename: 'Product' };
      client.writeQuery({ query, variables, data: { tempProductBySlug: savedProduct } });
      requests.verification(undefined);
    };
    if (overlappingRead && current?.description !== product.description) {
      // The read might include another administrator's later write.
      void verify().catch(() => {
        if (requests.publication === publication && !requests.pending) publishSave();
      });
      return current ?? product;
    }
    publishSave();
    // A different administrator can save between this commit and the arrival of its response.
    void verify().catch(() => {});
    return product;
  };
}

export function readSavedProductDescription(
  client: ApolloClient,
  slug: string,
  query: DescriptionQuery,
  purpose: ReadPurpose = 'load'
) {
  const requests = requestsFor(client, slug);
  if (requests.pending && purpose === 'load') return requests.pending;

  const request = ++requestCount;
  const variables = { slug };
  const supersedingResult = async () => {
    if (purpose !== 'conflict') return undefined;
    if (requests.pending) await requests.pending;
    const publication = requests.publication;
    if (!publication || publication.sequence <= request) return undefined;
    if (publication.source === 'save') {
      // The delayed read might precede or follow the actual commit. Read again after its acknowledgement.
      return readSavedProductDescription(client, slug, query, 'conflict');
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
          const sequence = ++requestCount;
          requests.publication = { sequence, source: 'read' };
          if (purpose === 'conflict') requests.authority = { sequence, source: 'conflict' };
          client.writeQuery({ query, variables, data });
          requests.verification(undefined);
        }
        return data;
      },
      (error: unknown) => {
        if (requests.pending !== read) return supersedingResult();
        if (requests.verification()?.status === 'loading') {
          requests.verification({ status: 'failed', error: descriptionReadError(error) });
        }
        throw error;
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
  const verification = useReactiveVar(requestsFor(client, slug).verification);
  const [failure, setFailure] = useState<{ slug: string; error: Error }>();
  const latestAttempt = useRef(0);

  const load = useCallback(async () => {
    const attempt = ++latestAttempt.current;
    try {
      await readSavedProductDescription(client, slug, query);
    } catch (error) {
      if (attempt === latestAttempt.current) {
        setFailure({ slug, error: descriptionReadError(error) });
      }
    }
  }, [client, slug, query]);

  useEffect(() => {
    if (!data && !cacheError) void load();
  }, [data, cacheError, load]);

  const verificationError = verification?.status === 'failed' ? verification.error : undefined;
  const error = cacheError ?? verificationError ?? (!data && failure?.slug === slug ? failure.error : undefined);
  const refetch = () => {
    setFailure(undefined);
    return load();
  };
  return {
    client,
    data,
    error,
    loading: !data && !error,
    verificationPending: verification?.status === 'loading',
    refetch,
  };
}
