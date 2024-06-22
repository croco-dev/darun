import { gql } from '@apollo/client';
import { notifications } from '@mantine/notifications';
import {
  usePublishProductOnPublishProductButtonMutation,
  useTempProductOnPublishProductButtonQuery,
} from './__generated__/usePublishProductButton';

gql`
  query TempProductOnPublishProductButton($slug: String!) {
    tempProductBySlug(slug: $slug) {
      id
      publishedAt
    }
  }
  mutation PublishProductOnPublishProductButton($input: PublishProductInput!) {
    publishProduct(input: $input) {
      product {
        id
        publishedAt
      }
    }
  }
`;

type PublishProductButtonProps = {
  slug: string;
};

export function usePublishProductButton({ slug }: PublishProductButtonProps) {
  const { data, loading } = useTempProductOnPublishProductButtonQuery({
    variables: {
      slug,
    },
  });
  const [publishProductMutation] = usePublishProductOnPublishProductButtonMutation({
    onError: error => {
      notifications.show({ message: error.message, color: 'red' });
    },
    onCompleted: data => {
      if (data.publishProduct.product.publishedAt) {
        notifications.show({ message: '서비스가 노출설정되었습니다.', color: 'teal' });
      }
    },
  });

  const publishProduct = async () => {
    await publishProductMutation({
      variables: {
        input: {
          slug,
        },
      },
    });
  };
  return {
    loading,
    isPublished: Boolean(data?.tempProductBySlug?.publishedAt),
    publishProduct,
  };
}
