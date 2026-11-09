import type { TypedDocumentNode } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { useCallback, useEffect, useRef, useState } from 'react';

type PageVariables = { status?: string | null; limit?: number | null; offset?: number | null };
type PageState = { scope: string; limit: number; nextOffset?: number; hasMore?: boolean };

// Both job lists use the same bounded requests and keep their own continuation position.
export function useLlmJobPages<Key extends string, Job extends { id: string }>(
  document: TypedDocumentNode<Record<Key, Job[]>, PageVariables>,
  field: Key,
  options: { scope: string; status?: string; skip: boolean }
) {
  const { scope, status, skip } = options;
  const { data, loading, error, fetchMore, refetch } = useQuery(document, {
    variables: { status, limit: 100, offset: 0 },
    fetchPolicy: 'cache-and-network',
    skip,
  });
  const [pageState, setPageState] = useState<PageState>({ scope, limit: 100 });
  const [busyScope, setBusyScope] = useState<string | null>(null);
  const request = useRef(0);
  const busy = useRef(false);
  useEffect(() => {
    request.current += 1;
    busy.current = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 필터를 다시 열어도 이전 이어읽기 위치를 재사용하지 않는다.
    setPageState({ scope, limit: 100 });

    setBusyScope(null);
    return () => {
      request.current += 1;
    };
  }, [scope]);
  const page = pageState.scope === scope ? pageState : { scope, limit: 100 };
  const rows = skip ? [] : (data?.[field] ?? []).slice(0, page.limit);
  const hasMore = !skip && (page.hasMore ?? rows.length === 100);

  const readPage = useCallback(
    async (offset: number, generation: number) => {
      const result = await fetchMore({
        variables: { status, limit: 100, offset },
        updateQuery(previous, { fetchMoreResult }) {
          if (request.current !== generation || !fetchMoreResult) return previous;
          const next = fetchMoreResult[field];
          const previousRows = previous?.[field] ?? [];
          return {
            ...fetchMoreResult,
            [field]: [
              ...previousRows.slice(0, offset),
              ...next,
              ...(next.length === 100 ? previousRows.slice(offset + 100) : []),
            ],
          };
        },
      });
      if (!result.data) throw new Error('작업 목록 응답을 확인하지 못했습니다.');
      return result.data[field].length;
    },
    [fetchMore, status, field]
  );

  const loadMore = useCallback(async () => {
    if (skip || busy.current || !hasMore) return;
    const generation = request.current;
    const offset = page.nextOffset ?? rows.length;
    busy.current = true;
    setBusyScope(scope);
    try {
      const length = await readPage(offset, generation);
      if (request.current === generation)
        setPageState({ scope, limit: offset + 100, nextOffset: offset + length, hasMore: length === 100 });
    } catch (error) {
      if (request.current === generation) throw error;
    } finally {
      if (request.current === generation) {
        busy.current = false;
        setBusyScope(null);
      }
    }
  }, [skip, hasMore, page.nextOffset, rows.length, readPage, scope]);

  const refresh = useCallback(async () => {
    if (skip || busy.current) return;
    const generation = request.current;
    busy.current = true;
    setBusyScope(scope);
    try {
      const count = Math.max(rows.length, page.nextOffset ?? 0);
      if (count <= 100) {
        const result = await refetch();
        const length = result.data?.[field].length ?? 0;
        if (request.current === generation)
          setPageState({ scope, limit: 100, nextOffset: length, hasMore: length === 100 });
      } else {
        for (let offset = 0; offset < count && request.current === generation; offset += 100) {
          const length = await readPage(offset, generation);
          if (request.current !== generation) return;
          if (length < 100 || offset + 100 >= count) {
            setPageState({ scope, limit: offset + 100, nextOffset: offset + length, hasMore: length === 100 });
            break;
          }
        }
      }
    } catch (error) {
      if (request.current === generation) throw error;
    } finally {
      if (request.current === generation) {
        busy.current = false;
        setBusyScope(null);
      }
    }
  }, [skip, scope, rows.length, page.nextOffset, refetch, field, readPage]);

  return {
    rows: rows.filter((row, index) => rows.findIndex(other => other.id === row.id) === index),
    loading: !skip && (loading || busyScope === scope),
    error: skip ? undefined : error,
    hasMore,
    loadMore,
    refresh,
  };
}
