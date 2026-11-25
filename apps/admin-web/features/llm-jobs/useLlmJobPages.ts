import type { TypedDocumentNode } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { useCallback, useEffect, useRef, useState } from 'react';

const PAGE_SIZE = 100;
type PageVariables = {
  status?: string | null;
  first?: number | null;
  after?: string | null;
};
type JobPage<Job> = { jobs: Job[]; nextCursor?: string | null };
type LoadedHistory<Job> = { scope: string; pages: JobPage<Job>[] };

export function useLlmJobPages<Key extends string, Job extends { id: string }>(
  document: TypedDocumentNode<Record<Key, JobPage<Job>>, PageVariables>,
  field: Key,
  options: { scope: string; status?: string; skip: boolean }
) {
  const { scope, status, skip } = options;
  const { client, data, loading, error } = useQuery(document, {
    variables: { status, first: PAGE_SIZE },
    fetchPolicy: 'cache-and-network',
    skip,
  });
  const [history, setHistory] = useState<LoadedHistory<Job>>();
  const [busyScope, setBusyScope] = useState<string | null>(null);
  const [refreshedFirst, setRefreshedFirst] = useState<{ status?: string; page: JobPage<Job> }>();
  const [refreshFailure, setRefreshFailure] = useState<{ scope: string; error: unknown }>();
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 돌아온 필터에서도 첫 페이지부터 시작한다.
    setHistory(undefined);
    setBusyScope(null);
    // 같은 작업 종류·상태를 계속 표시할 때는 갱신된 첫 페이지를 유지한다.
    setRefreshedFirst(first => (!skip && first?.status === status ? first : undefined));
    setRefreshFailure(undefined);
    return () => {
      activeRequest.current?.abort();
      activeRequest.current = null;
    };
  }, [scope, skip, status]);

  const refreshedPage = refreshedFirst?.status === status ? refreshedFirst?.page : undefined;
  const firstPage = refreshedPage ?? data?.[field];
  const loaded = history?.scope === scope ? history.pages : undefined;
  const nextCursor = loaded ? loaded.at(-1)?.nextCursor : firstPage?.nextCursor;
  const initialError = refreshedPage ? undefined : error;
  const listError = refreshFailure?.scope === scope ? refreshFailure.error : initialError;

  const readPage = useCallback(
    async (after: string | undefined, signal: AbortSignal) => {
      const result = await client.query({
        query: document,
        variables: { status, first: PAGE_SIZE, after },
        fetchPolicy: 'no-cache',
        context: { fetchOptions: { signal }, queryDeduplication: false },
      });
      const page = result.data?.[field];
      if (!page) throw new Error('작업 목록 응답을 확인하지 못했습니다.');
      return page;
    },
    [client, document, status, field]
  );

  const update = useCallback(
    async (read: (signal: AbortSignal) => Promise<JobPage<Job>[]>) => {
      if (skip || activeRequest.current) return;
      const controller = new AbortController();
      activeRequest.current = controller;
      const { signal } = controller;
      setBusyScope(scope);
      try {
        const pages = await read(signal);
        if (!signal.aborted) setHistory({ scope, pages });
      } catch (error) {
        if (!signal.aborted) throw error;
      } finally {
        if (!signal.aborted) {
          activeRequest.current = null;
          setBusyScope(null);
        }
      }
    },
    [scope, skip]
  );

  const loadMore = useCallback(async () => {
    const pages = loaded ?? (firstPage ? [firstPage] : undefined);
    if (!pages || !nextCursor) return;
    await update(async signal => [...pages, await readPage(nextCursor, signal)]);
  }, [firstPage, loaded, nextCursor, readPage, update]);

  const refresh = useCallback(async () => {
    await update(async signal => {
      try {
        const first = await readPage(undefined, signal);
        const pages = [first];
        let after = first.nextCursor;
        while (after && loaded && pages.length < loaded.length && !signal.aborted) {
          const page = await readPage(after, signal);
          pages.push(page);
          after = page.nextCursor;
        }
        if (!signal.aborted) {
          setRefreshedFirst({ status, page: first });
          setRefreshFailure(undefined);
        }
        return pages;
      } catch (error) {
        if (!signal.aborted) setRefreshFailure({ scope, error });
        throw error;
      }
    });
  }, [loaded, readPage, scope, status, update]);

  const seen = new Set<string>();
  const rows = skip ? [] : (loaded?.flatMap(page => page.jobs) ?? firstPage?.jobs ?? []);
  return {
    rows: rows.filter(job => {
      if (seen.has(job.id)) return false;
      seen.add(job.id);
      return true;
    }),
    loading: !skip && (loading || busyScope === scope),
    error: skip ? undefined : listError,
    hasMore: !skip && Boolean(nextCursor),
    loadMore,
    refresh,
  };
}
