import { gql } from '@apollo/client';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import {
  useAddProductTagsOnProductTagFormMutation,
  useTempProductBySlugOnProductTagsFormQuery,
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

  mutation AddProductTagsOnProductTagForm($slug: String!, $input: AddProductTagsInput!) {
    addProductTags(slug: $slug, input: $input) {
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
  const [addProductTags] = useAddProductTagsOnProductTagFormMutation({
    onError: error => {
      notifications.show({ message: error.message, color: 'red' });
    },
    onCompleted: data => {
      if (data.addProductTags) {
        notifications.show({ message: '태그 수정이 반영되었어요.', color: 'teal' });
      }
    },
  });

  const updateTags = (newTags: string[]) => {
    setTags(newTags);
  };

  const applyTags = async () => {
    await addProductTags({
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
