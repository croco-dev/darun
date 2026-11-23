'use client';

import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { useApolloClient, useLazyQuery } from '@apollo/client/react';
import {
  SearchProductsOnVisualExplorerDocument,
  VisualAppsOnCatalogDocument,
  VisualAppSuggestionsOnAppExplorerDocument,
} from '@darun/provider-graphql';
import { useCallback, useEffect, useRef, useState } from 'react';

const DEBOUNCE_MS = 300;
const MAX_RESULTS = 8;
const MAX_QUERY_LENGTH = 100;

type TimerId = ReturnType<typeof setTimeout>;

export type ProductSuggestion = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string;
};

export function useProductSearchSuggest(scope: 'products' | 'visualApps' = 'products') {
  const client = useApolloClient();
  const [searchProducts] = useLazyQuery(SearchProductsOnVisualExplorerDocument);
  const [searchVisualApps] = useLazyQuery(VisualAppSuggestionsOnAppExplorerDocument, { fetchPolicy: 'no-cache' });
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const latestSearchRequestId = useRef(0);
  const debounceTimerRef = useRef<TimerId | null>(null);

  const searchCatalogApps = useCallback(
    async (query: string) => {
      const variables = { query, first: MAX_RESULTS };
      try {
        return (await searchVisualApps({ variables })).data?.visualAppSuggestions;
      } catch (error) {
        // The Visual build can reach the previous API while the Lambda deploy is still running.
        if (
          !CombinedGraphQLErrors.is(error) ||
          error.errors.length !== 1 ||
          error.errors[0].extensions?.code !== 'GRAPHQL_VALIDATION_FAILED' ||
          !error.errors[0].message.startsWith('Cannot query field "visualAppSuggestions" on type "Query".')
        ) {
          throw error;
        }
        const { data } = await client.query({
          query: VisualAppsOnCatalogDocument,
          variables,
          fetchPolicy: 'no-cache',
        });
        return data?.visualApps.edges.map(edge => edge.node);
      }
    },
    [client, searchVisualApps]
  );

  useEffect(() => {
    return () => {
      latestSearchRequestId.current += 1;
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const clearSuggestions = useCallback(() => {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    latestSearchRequestId.current += 1;
    setSuggestions([]);
    setIsSearching(false);
  }, []);

  const suggest = useCallback(
    (query: string) => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }

      const requestId = ++latestSearchRequestId.current;
      setSuggestions([]);
      const trimmed = query.trim();

      if (trimmed.length === 0) {
        debounceTimerRef.current = null;
        setSuggestions([]);
        setIsSearching(false);
        return;
      }

      if (trimmed.length > MAX_QUERY_LENGTH) {
        setSuggestions([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);

      debounceTimerRef.current = setTimeout(async () => {
        debounceTimerRef.current = null;

        try {
          const products =
            scope === 'visualApps'
              ? await searchCatalogApps(trimmed)
              : (await searchProducts({ variables: { query: trimmed } })).data?.searchProducts?.slice(0, MAX_RESULTS);

          if (requestId !== latestSearchRequestId.current) {
            return;
          }

          setSuggestions(
            (products ?? []).map(p => ({
              id: p.id ?? '',
              name: p.name ?? '',
              slug: p.slug ?? '',
              logoUrl: p.logoUrl ?? '',
            }))
          );
        } catch (error) {
          console.error('Product search suggest failed:', error);
          if (requestId === latestSearchRequestId.current) {
            setSuggestions([]);
          }
        } finally {
          if (requestId === latestSearchRequestId.current) {
            setIsSearching(false);
          }
        }
      }, DEBOUNCE_MS);
    },
    [scope, searchCatalogApps, searchProducts]
  );

  return { suggestions, isSearching, clearSuggestions, suggest };
}
