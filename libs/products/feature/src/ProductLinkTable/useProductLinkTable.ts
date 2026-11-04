import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import {
  EditProductLinkItemFragment,
  ProductLinkTableFragmentDoc,
  TempProductBySlugOnProductLinkTableDocument,
  useFragment,
} from '@darun/provider-graphql';
import { useCallback, useState } from 'react';

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

  const editLink = useCallback(
    (selectedLink: EditProductLinkItemFragment) => {
      setEdit({ slug, link: selectedLink });
    },
    [slug]
  );
  const closeEditModal = useCallback(() => {
    setEdit(current => (current === edit ? null : current));
  }, [edit]);
  const refreshLinks = useCallback(() => {
    if (observable.variables.slug !== slug) return;
    void refetch().catch(() => {
      // The query exposes the failure and the list offers a read-only retry.
    });
  }, [observable, refetch, slug]);

  return {
    links: product?.links,
    loading,
    error,
    refreshLinks,
    editLink,
    closeEditModal,
    link: edit?.slug === slug ? edit.link : null,
    slug,
  };
}
