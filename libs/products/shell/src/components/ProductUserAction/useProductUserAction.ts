import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';
import { ProductBySlugOnProductUserActionDocument, UpvoteProductOnProductUserActionDocument } from '@darun/provider-graphql';
import { useLocale } from 'next-intl';
import { useState } from 'react';


void gql`
  query ProductBySlugOnProductUserAction($slug: String!, $locale: String!) {
    productBySlug(slug: $slug, locale: $locale) {
      id
      name
      voteCount
    }
  }
  mutation UpvoteProductOnProductUserAction($slug: String!) {
    upvoteProduct(slug: $slug) {
      product {
        id
        voteCount
      }
    }
  }
`;

type ProductUserActionProps = {
  slug: string;
};

export function useProductUserAction({ slug }: ProductUserActionProps) {
  const locale = useLocale();
  const { data } = useQuery(ProductBySlugOnProductUserActionDocument, {
    variables: {
      slug,
      locale,
    },
  });
  const [upvoteProductMutation] = useMutation(UpvoteProductOnProductUserActionDocument, {
    variables: {
      slug,
    },
  });

  const [voted, setVoted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optimisticCount, setOptimisticCount] = useState<number | null>(null);

  const upvoteProduct = async () => {
    if (loading) return;

    setLoading(true);
    setError(null);

    // Optimistic update: immediately increment count
    const currentCount = optimisticCount ?? data?.productBySlug?.voteCount ?? 0;
    setOptimisticCount(currentCount + 1);
    setVoted(true);

    try {
      await upvoteProductMutation({ variables: { slug } });
      // Success: keep the optimistic count
      setOptimisticCount(null);
    } catch (err) {
      // Error: revert optimistic update
      setOptimisticCount(null);
      setVoted(false);
      setError('투표에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return {
    upvoteProduct,
    voteCount: optimisticCount ?? data?.productBySlug?.voteCount ?? 0,
    voted,
    loading,
    error,
    slug,
  };
}
