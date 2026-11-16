import { gql } from '@apollo/client';
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
import {
  DeleteProductFlowOnDetailSectionDocument,
  GetProductFlowsOnDetailSectionDocument,
  type GetProductFlowsOnDetailSectionQuery,
} from '@darun/provider-graphql';
import { notifications } from '@mantine/notifications';
import { useRef, useState } from 'react';

gql`
  query GetProductFlowsOnDetailSection($slug: String!, $after: String) {
    adminProductFlowSummaries(productSlug: $slug, after: $after) {
      edges {
        node {
          id
          ...AdminProductFlowCard
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }

  fragment AdminProductFlowCard on AdminProductFlowSummary {
    id
    title
    platform
    flowType
    stepCount
    coverScreenshot {
      id
      imageUrl
      imageAlt
    }
  }

  mutation DeleteProductFlowOnDetailSection($id: ID!) {
    deleteProductFlow(input: { id: $id }) {
      success
    }
  }
`;

type FlowPage = GetProductFlowsOnDetailSectionQuery['adminProductFlowSummaries'];
type LoadedPage = { after: string; page: FlowPage };
type PageRequest = { kind: 'append'; after: string } | { kind: 'refresh'; after: string | null };

function withoutFlow(page: FlowPage, id: string): FlowPage {
  return { ...page, edges: page.edges.filter(({ node }) => node.id !== id) };
}

export function useProductFlowPages(slug: string) {
  const client = useApolloClient();
  const { data, error, loading, refetch } = useQuery(GetProductFlowsOnDetailSectionDocument, {
    variables: { slug },
    fetchPolicy: 'network-only',
    nextFetchPolicy: 'cache-first',
  });
  const [mutate] = useMutation(DeleteProductFlowOnDetailSectionDocument);
  const [pages, setPages] = useState<LoadedPage[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loadingPage, setLoadingPage] = useState(false);
  const [failedRequest, setFailedRequest] = useState<PageRequest | null>(null);
  const busy = useRef(false);

  const firstPage = data?.adminProductFlowSummaries;
  const tail = pages.at(-1);
  const pageInfo = (tail?.page ?? firstPage)?.pageInfo;
  const ids = [firstPage, ...pages.map(({ page }) => page)].flatMap(
    page => page?.edges.map(({ node }) => node.id) ?? []
  );

  const readPage = async (request: PageRequest) => {
    setLoadingPage(true);
    setFailedRequest(null);
    try {
      const result = await client.query({
        query: GetProductFlowsOnDetailSectionDocument,
        variables: request.after === null ? { slug } : { slug, after: request.after },
        fetchPolicy: 'network-only',
      });
      if (!result.data) throw new Error('플로 목록 응답이 비어 있습니다.');
      const page = result.data.adminProductFlowSummaries;
      if (request.after !== null) {
        const loaded = { after: request.after, page };
        setPages(current => (request.kind === 'append' ? [...current, loaded] : [...current.slice(0, -1), loaded]));
      }
      return page.pageInfo.hasNextPage;
    } catch {
      setFailedRequest(request);
    } finally {
      setLoadingPage(false);
    }
  };

  const requestPage = async (request: PageRequest) => {
    if (busy.current) return;
    busy.current = true;
    try {
      return await readPage(request);
    } finally {
      busy.current = false;
    }
  };

  const deleteFlow = async (id: string) => {
    if (busy.current) return;
    busy.current = true;
    setDeletingId(id);
    try {
      const result = await mutate({ variables: { id } });
      if (!result.data?.deleteProductFlow.success) throw new Error('플로 삭제 결과를 확인할 수 없습니다.');

      client.cache.updateQuery(
        { query: GetProductFlowsOnDetailSectionDocument, variables: { slug } },
        previous =>
          previous && {
            adminProductFlowSummaries: withoutFlow(previous.adminProductFlowSummaries, id),
          }
      );
      setPages(current =>
        current.map(({ after, page }) => ({
          after,
          page: withoutFlow(page, id),
        }))
      );
      notifications.show({ message: '플로가 삭제되었습니다.', color: 'teal' });

      // Keep the visible prefix and refresh only the last loaded page.
      await readPage({ kind: 'refresh', after: tail?.after ?? null });
    } catch (error) {
      notifications.show({
        title: '삭제 실패',
        message: error instanceof Error ? error.message : '플로를 삭제하지 못했습니다.',
        color: 'red',
      });
    } finally {
      busy.current = false;
      setDeletingId(null);
    }
  };

  return {
    ids,
    loading,
    error,
    refetch,
    deletingId,
    deleteFlow,
    loadingPage,
    pageFailure: failedRequest?.kind,
    hasNextPage: pageInfo?.hasNextPage ?? false,
    loadMore: () => {
      const after = pageInfo?.endCursor;
      if (pageInfo?.hasNextPage && after) return requestPage({ kind: 'append', after });
    },
    retryPage: () => {
      if (failedRequest) return requestPage(failedRequest);
    },
  };
}
