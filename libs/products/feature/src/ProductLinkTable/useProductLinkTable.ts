import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import {
  EditProductLinkItemFragment,
  ProductLinkTableFragmentDoc,
  TempProductBySlugOnProductLinkTableDocument,
  useFragment,
} from '@darun/provider-graphql';
import { useCallback, useEffect, useRef, useState } from 'react';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
gql`
  query TempProductBySlugOnProductLinkTable($slug: String!) {
    tempProductBySlug(slug: $slug) {
      id
      ...ProductLinkTable
    }
  }
`;

type ProductLinkTableProps = {
  slug: string;
};

export function useProductLinkTable({ slug }: ProductLinkTableProps) {
  const { data, loading, error, observable, refetch } = useQuery(TempProductBySlugOnProductLinkTableDocument, {
    variables: { slug },
  });
  const product = useFragment(ProductLinkTableFragmentDoc, data?.tempProductBySlug ?? null);

  const [edit, setEdit] = useState<{
    slug: string;
    link: EditProductLinkItemFragment;
  } | null>(null);
  if (edit && edit.slug !== slug) setEdit(null);

  const [savedRefresh, setSavedRefresh] = useState<{ slug: string } | null>(null);
  const startedRefresh = useRef<typeof savedRefresh>(null);
  if (savedRefresh && savedRefresh.slug !== slug) setSavedRefresh(null);

  const editLink = useCallback(
    (selectedLink: EditProductLinkItemFragment) => {
      setEdit({ slug, link: selectedLink });
    },
    [slug]
  );
  const closeEditModal = useCallback(() => {
    setEdit(current => (current === edit ? null : current));
  }, [edit]);
  const refreshLinks = useCallback(async () => {
    if (observable.variables.slug !== slug) return;
    await refetch().catch(() => {
      // The query exposes the failure and the list offers a read-only retry.
    });
  }, [observable, refetch, slug]);
  const finishEdit = useCallback(() => {
    closeEditModal();
    if (observable.variables.slug === slug) setSavedRefresh({ slug });
  }, [closeEditModal, observable, slug]);

  useEffect(() => {
    if (!savedRefresh || startedRefresh.current === savedRefresh || loading || observable.getCurrentResult().loading) {
      return;
    }

    // A refetch started during an older read can reuse its pre-save response.
    startedRefresh.current = savedRefresh;
    void refreshLinks().finally(() => {
      setSavedRefresh(current => (current === savedRefresh ? null : current));
    });
  }, [loading, observable, refreshLinks, savedRefresh]);

  return {
    links: product?.links,
    loading: loading || savedRefresh?.slug === slug,
    error,
    refreshLinks,
    editLink,
    closeEditModal,
    finishEdit,
    link: edit?.slug === slug ? edit.link : null,
    slug,
  };
}
