'use client';

import { useLazyQuery } from '@apollo/client/react';
import { SearchProductsOnVisualExplorerDocument } from '@darun/provider-graphql';
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

export function useProductSearchSuggest() {
  const [search] = useLazyQuery(SearchProductsOnVisualExplorerDocument);
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const latestSearchRequestId = useRef(0);
  const debounceTimerRef = useRef<TimerId | null>(null);

  useEffect(() => {
    return () => {
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

      const trimmed = query.trim();

      if (trimmed.length === 0) {
        latestSearchRequestId.current += 1;
        setSuggestions([]);
        setIsSearching(false);
        return;
      }

      if (trimmed.length > MAX_QUERY_LENGTH) {
        latestSearchRequestId.current += 1;
        setSuggestions([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);

      debounceTimerRef.current = setTimeout(async () => {
        const requestId = latestSearchRequestId.current + 1;
        latestSearchRequestId.current = requestId;

        try {
          const { data } = await search({ variables: { query: trimmed } });

          if (requestId !== latestSearchRequestId.current) {
            return;
          }

          const products = data?.searchProducts ?? [];
          setSuggestions(
            products
              .map(p => ({
                id: p.id ?? '',
                name: p.name ?? '',
                slug: p.slug ?? '',
                logoUrl: p.logoUrl ?? '',
              }))
              .slice(0, MAX_RESULTS)
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
    [search]
  );

  return { suggestions, isSearching, clearSuggestions, suggest };
}
