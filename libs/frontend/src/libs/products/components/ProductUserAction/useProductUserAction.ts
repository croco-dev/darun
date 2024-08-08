import { gql } from '@apollo/client';
import {
  useProductBySlugOnProductUserActionQuery,
  useUpvoteProductOnProductUserActionMutation,
} from './__generated__/useProductUserAction';

gql`
  query ProductBySlugOnProductUserAction($slug: String!) {
    productBySlug(slug: $slug) {
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
  const { data } = useProductBySlugOnProductUserActionQuery({
    variables: {
      slug,
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
