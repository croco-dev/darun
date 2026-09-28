import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  ProductBySlugOnProductUserActionDocument,
  UpvoteProductOnProductUserActionDocument,
} from '@darun/provider-graphql';
import { useLocale } from 'next-intl';
import { useState, useSyncExternalStore } from 'react';

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

const VOTED_PRODUCTS_KEY = 'darun-voted-products';
const EMPTY_SNAPSHOT = '[]';

function subscribeVoted(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener('darun-voted-updated', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('darun-voted-updated', callback);
  };
}

function getVotedSnapshot(): string {
  try {
    return localStorage.getItem(VOTED_PRODUCTS_KEY) ?? EMPTY_SNAPSHOT;
  } catch {
    return EMPTY_SNAPSHOT;
  }
}

function getServerVotedSnapshot(): string {
  return EMPTY_SNAPSHOT;
}

function saveVotedSlug(slug: string) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(VOTED_PRODUCTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const votedSlugs: string[] = Array.isArray(parsed) ? parsed : [];
    if (!votedSlugs.includes(slug)) {
      votedSlugs.push(slug);
      localStorage.setItem(VOTED_PRODUCTS_KEY, JSON.stringify(votedSlugs));
      window.dispatchEvent(new Event('darun-voted-updated'));
    }
  } catch {
    // Ignore localStorage write error
  }
}

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

  const votedRaw = useSyncExternalStore(subscribeVoted, getVotedSnapshot, getServerVotedSnapshot);
  const isPersistedVoted = votedRaw.includes(`"${slug}"`);
  const [localVoted, setLocalVoted] = useState(false);
  const voted = isPersistedVoted || localVoted;
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
    setLocalVoted(true);
    saveVotedSlug(slug);

    try {
      await upvoteProductMutation({ variables: { slug } });
      // Success: keep the optimistic count
      setOptimisticCount(null);
    } catch (err: unknown) {
      // Error: revert optimistic update
      setOptimisticCount(null);
      const message = err instanceof Error ? err.message : '';
      const isEn = locale === 'en';

      if (message.includes('duplicate-vote')) {
        setLocalVoted(true);
        saveVotedSlug(slug);
        setError(isEn ? 'You have already voted for this product.' : '이미 투표한 서비스입니다.');
      } else if (message.includes('rate-limit-exceeded')) {
        setLocalVoted(false);
        setError(
          isEn
            ? 'Too many vote attempts. Please try again in a minute.'
            : '단시간에 너무 많은 투표를 시도했습니다. 잠시 후 다시 시도해주세요.'
        );
      } else {
        setLocalVoted(false);
        setError(isEn ? 'Failed to vote. Please try again.' : '투표에 실패했습니다. 다시 시도해주세요.');
      }
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
