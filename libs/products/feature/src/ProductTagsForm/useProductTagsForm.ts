'use client';

import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  TempProductBySlugOnProductTagsFormDocument,
  UpdateProductTagsOnProductTagFormDocument,
} from '@darun/provider-graphql';
import { notifications } from '@mantine/notifications';
import { useRef, useState } from 'react';

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
  const [updateProductTags, { loading }] = useMutation(UpdateProductTagsOnProductTagFormDocument, {
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

  const isSubmittingRef = useRef(false);

  const updateTags = (newTags: string[]) => {
    setEditedTags(newTags);
  };

  const applyTags = async () => {
    if (isSubmittingRef.current || loading) return;
    isSubmittingRef.current = true;
    try {
      await updateProductTags({
        variables: {
          slug,
          input: {
            tagNames: tags,
          },
        },
      });
    } catch {
      // Handled by onError callback
    } finally {
      isSubmittingRef.current = false;
    }
  };
  return {
    tags,
    updateTags,
    applyTags,
    loading,
  };
}
