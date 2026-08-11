import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  TempProductBySlugOnProductTagsFormDocument,
  UpdateProductTagsOnProductTagFormDocument,
} from '@darun/provider-graphql';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
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
  const [editedTags, setEditedTags] = useState<string[] | undefined>();

  const { data } = useQuery(TempProductBySlugOnProductTagsFormDocument, {
    variables: {
      slug,
    },
  });

  const fetchedTags = data?.tempProductBySlug?.tags.map(tag => tag.name) ?? [];
  const tags = editedTags ?? fetchedTags;
  const [updateProductTags] = useMutation(UpdateProductTagsOnProductTagFormDocument, {
    onError: error => {
      notifications.show({ message: error.message, color: 'red' });
    },
    onCompleted: data => {
      if (data.updateProductTags.product?.id) {
        notifications.show({
          message: '태그 수정이 반영되었어요.',
          color: 'teal',
        });
      }
    },
  });

  const updateTags = (newTags: string[]) => {
    setEditedTags(newTags);
  };

  const applyTags = async () => {
    try {
      await updateProductTags({
        variables: {
          slug,
          input: {
            tagNames: tags,
          },
        },
      });
    } catch (error) {
      console.error('mutation failed:', error);
      throw error;
    }
  };
  return {
    tags,
    updateTags,
    applyTags,
  };
}
