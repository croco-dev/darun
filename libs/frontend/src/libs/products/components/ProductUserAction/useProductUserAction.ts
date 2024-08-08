import { gql } from '@apollo/client';
import { useUpvoteProductOnProductUserActionMutation } from './__generated__/useProductUserAction';

gql`
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
  };
}
