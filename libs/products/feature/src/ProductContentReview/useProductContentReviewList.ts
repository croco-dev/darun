import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { AdminProductContentReviewInboxDocument, type AdminProductContentReviewFilter } from '@darun/provider-graphql';
import { useState } from 'react';

gql`
  query AdminProductContentReviewInbox($filter: AdminProductContentReviewFilter!, $after: String) {
    adminProductContentReviewPage(filter: $filter, after: $after) {
      items {
        id
        name
        slug
        status
        due
        nextReviewOn
      }
      nextCursor
    }
  }
`;

export function useProductContentReviewList() {
  const [filter, setFilter] = useState<AdminProductContentReviewFilter>('ALL');
  const [cursors, setCursors] = useState<string[]>([]);
  const { data, loading, error, refetch } = useQuery(AdminProductContentReviewInboxDocument, {
    variables: { filter, after: cursors[cursors.length - 1] ?? null },
    fetchPolicy: 'no-cache',
  });
  const page = data?.adminProductContentReviewPage;

  return {
    filter,
    page,
    loading,
    error,
    pageNumber: cursors.length + 1,
    selectFilter(value: AdminProductContentReviewFilter) {
      setFilter(value);
      setCursors([]);
    },
    retry: () => void refetch().catch(() => {}),
    previous: () => setCursors(current => current.slice(0, -1)),
    next: () => {
      if (page?.nextCursor) setCursors([...cursors, page.nextCursor]);
    },
  };
}
