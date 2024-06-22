import { gql } from '@apollo/client';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import {
  useTempProductBySlugOnProductTagsFormQuery,
  useUpdateProductTagsOnProductTagFormMutation,
} from './__generated__/useProductTagsForm';

gql`
  query TempProductBySlugOnProductTagsForm($slug: String!) {
    tempProductBySlug(slug: $slug) {
      id
      tags {
        id
        name
      }
    }
  }

  mutation UpdateProductTagsOnProductTagForm($slug: String!, $input: UpdateProductTagsInput!) {
    updateProductTags(slug: $slug, input: $input) {
      product {
        id
        tags {
          id
          name
        }
      }
    }
  }
`;

type ProductTagsFormProps = {
  slug: string;
};
export function useProductTagsForm({ slug }: ProductTagsFormProps) {
  const [tags, setTags] = useState<string[]>([]);

  useTempProductBySlugOnProductTagsFormQuery({
    variables: {
      slug,
    },
    onCompleted: data => {
      setTags(data.tempProductBySlug?.tags.map(tag => tag.name) ?? []);
    },
  });
  const [updateProductTags] = useUpdateProductTagsOnProductTagFormMutation({
    onError: error => {
      notifications.show({ message: error.message, color: 'red' });
    },
    onCompleted: data => {
      if (data.updateProductTags.product?.id) {
        notifications.show({ message: '태그 수정이 반영되었어요.', color: 'teal' });
      }
    },
  });

  const updateTags = (newTags: string[]) => {
    setTags(newTags);
  };

  const applyTags = async () => {
    await updateProductTags({
      variables: {
        slug,
        input: {
          tagNames: tags,
        },
      },
    });
  };
  return {
    tags,
    updateTags,
    applyTags,
  };
}
