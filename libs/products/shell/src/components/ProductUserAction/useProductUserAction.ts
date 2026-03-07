import { gql } from '@apollo/client';
import { useLocale } from 'next-intl';
import {
  useProductBySlugOnProductUserActionQuery,
  useUpvoteProductOnProductUserActionMutation,
} from './__generated__/useProductUserAction';

gql`
  query ProductBySlugOnProductUserAction($slug: String!, $locale: String!) {
    productBySlug(slug: $slug, locale: $locale) {
      id
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
  const { data } = useProductBySlugOnProductUserActionQuery({
    variables: {
      slug,
      locale,
    },
  });
  const [upvoteProductMutation] = useUpvoteProductOnProductUserActionMutation({
    variables: {
      slug,
    },
  });

  const upvoteProduct = async () => {
    await upvoteProductMutation();
  };
  return {
    upvoteProduct,
    voteCount: data?.productBySlug?.voteCount ?? 0,
  };
}
