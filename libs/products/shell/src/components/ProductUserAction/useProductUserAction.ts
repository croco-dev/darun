import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  ProductBySlugOnProductUserActionDocument,
  UpvoteProductOnProductUserActionDocument,
} from '@darun/provider-graphql';
import { useLocale } from 'next-intl';
import { useRef, useState, useSyncExternalStore } from 'react';

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

  const votedRaw = useSyncExternalStore(subscribeVoted, getVotedSnapshot, getServerVotedSnapshot);
  const isPersistedVoted = votedRaw.includes(`"${slug}"`);
  const [upvoteProductMutation] = useMutation(UpvoteProductOnProductUserActionDocument);
  const inFlight = useRef(new Set<string>());
  const [state, setState] = useState<{
    identity: { slug: string };
    voted: boolean;
    loading: boolean;
    error: string | null;
    success: boolean;
  }>({
    identity: { slug },
    voted: false,
    loading: false,
    error: null,
    success: false,
  });
  if (state.identity.slug !== slug) {
    setState({ identity: { slug }, voted: false, loading: false, error: null, success: false });
  }
  const current = state.identity.slug === slug ? state : { voted: false, loading: false, error: null, success: false };
  const voted = isPersistedVoted || current.voted;

  const upvoteProduct = async () => {
    if (voted || inFlight.current.has(slug)) return;
    const requestSlug = slug;
    const requestIdentity = state.identity;
    inFlight.current.add(requestSlug);
    setState({ identity: requestIdentity, voted: false, loading: true, error: null, success: false });
    try {
      await upvoteProductMutation({ variables: { slug: requestSlug } });
      saveVotedSlug(requestSlug);
      setState(current =>
        current.identity === requestIdentity
          ? { identity: requestIdentity, voted: true, loading: false, error: null, success: true }
          : current
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      const duplicate = message.includes('duplicate-vote');
      if (duplicate) saveVotedSlug(requestSlug);
      setState(current => {
        if (current.identity !== requestIdentity) return current;
        const error = duplicate
          ? locale === 'en'
            ? 'You have already voted for this product.'
            : '이미 투표한 서비스입니다.'
          : message.includes('rate-limit-exceeded')
            ? locale === 'en'
              ? 'Too many vote attempts. Please try again in a minute.'
              : '단시간에 너무 많은 투표를 시도했습니다. 잠시 후 다시 시도해주세요.'
            : locale === 'en'
              ? 'Failed to vote. Please try again.'
              : '투표에 실패했습니다. 다시 시도해주세요.';
        return { identity: requestIdentity, voted: duplicate, loading: false, error, success: false };
      });
    } finally {
      inFlight.current.delete(requestSlug);
    }
  };

  return {
    upvoteProduct,
    voteCount: data?.productBySlug?.voteCount ?? 0,
    voted,
    loading: current.loading,
    error: current.error,
    success: current.success,
    slug,
  };
}
