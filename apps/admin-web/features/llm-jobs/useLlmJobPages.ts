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
  const { client, data, loading, error, refetch } = useQuery(document, {
    variables: { status, first: PAGE_SIZE },
    fetchPolicy: 'cache-and-network',
    skip,
  });
  const [history, setHistory] = useState<LoadedHistory<Job>>();
  const [busyScope, setBusyScope] = useState<string | null>(null);
  const generation = useRef(0);
  const busy = useRef(false);

  useEffect(() => {
    busy.current = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 돌아온 필터에서도 첫 페이지부터 시작한다.
    setHistory(undefined);
    setBusyScope(null);
    return () => {
      generation.current += 1;
    };
  }, [scope]);

  const firstPage = data?.[field];
  const loaded = history?.scope === scope ? history.pages : undefined;
  const nextCursor = loaded ? loaded.at(-1)?.nextCursor : firstPage?.nextCursor;

  const readOlderPage = useCallback(
    async (after: string) => {
      const result = await client.query({
        query: document,
        variables: { status, first: PAGE_SIZE, after },
        fetchPolicy: 'no-cache',
      });
      const page = result.data?.[field];
      if (!page) throw new Error('작업 목록 응답을 확인하지 못했습니다.');
      return page;
    },
    [client, document, status, field]
  );

  const update = useCallback(
    async (read: (isCurrent: () => boolean) => Promise<JobPage<Job>[] | undefined>) => {
      if (skip || busy.current) return;
      const request = generation.current;
      const isCurrent = () => generation.current === request;
      busy.current = true;
      setBusyScope(scope);
      try {
        const pages = await read(isCurrent);
        if (pages && isCurrent()) setHistory({ scope, pages });
      } catch (error) {
        if (isCurrent()) throw error;
      } finally {
        if (isCurrent()) {
          busy.current = false;
          setBusyScope(null);
        }
      }
    },
    [scope, skip]
  );

  const loadMore = useCallback(async () => {
    const pages = loaded ?? (firstPage ? [firstPage] : undefined);
    if (!pages || !nextCursor) return;
    await update(async () => [...pages, await readOlderPage(nextCursor)]);
  }, [firstPage, loaded, nextCursor, readOlderPage, update]);

  const refresh = useCallback(async () => {
    await update(async isCurrent => {
      const first = (await refetch()).data?.[field];
      if (!first) throw new Error('작업 목록 응답을 확인하지 못했습니다.');
      if (!loaded) return undefined;

      const pages = [first];
      let after = first.nextCursor;
      while (after && pages.length < loaded.length && isCurrent()) {
        const page = await readOlderPage(after);
        pages.push(page);
        after = page.nextCursor;
      }
      return pages;
    });
  }, [field, loaded, readOlderPage, refetch, update]);

  const seen = new Set<string>();
  const rows = skip ? [] : (loaded?.flatMap(page => page.jobs) ?? firstPage?.jobs ?? []);
  return {
    rows: rows.filter(job => {
      if (seen.has(job.id)) return false;
      seen.add(job.id);
      return true;
    }),
    loading: !skip && (loading || busyScope === scope),
    error: skip ? undefined : error,
    hasMore: !skip && Boolean(nextCursor),
    loadMore,
    refresh,
  };
}
