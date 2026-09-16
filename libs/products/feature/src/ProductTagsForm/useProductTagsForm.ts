'use client';

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
  const [inputValue, setInputValue] = useState<string | null>(null);

  const { data, loading: isLoading } = useQuery(TempProductBySlugOnProductTagsFormDocument, {
    variables: { slug },
  });

  const fetchedTags = data?.tempProductBySlug?.tags.map(tag => tag.name) ?? [];
  const currentInputValue = inputValue !== null ? inputValue : fetchedTags.join(', ');

  const currentTags = currentInputValue
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);

  const [updateProductTags, { loading: isSaving }] = useMutation(UpdateProductTagsOnProductTagFormDocument, {
    refetchQueries: [TempProductBySlugOnProductTagsFormDocument],
    awaitRefetchQueries: true,
    onError: error => {
      notifications.show({ message: error.message, color: 'red' });
    },
    onCompleted: data => {
      if (data.updateProductTags.product?.id) {
        notifications.show({
          message: '태그 수정이 반영되었어요.',
          color: 'teal',
        });
        const updated = data.updateProductTags.product.tags.map(t => t.name);
        setInputValue(updated.join(', '));
      }
    },
  });

  const handleInputChange = (value: string) => {
    setInputValue(value);
  };

  const removeTag = (tagToRemove: string) => {
    if (isSaving || isLoading) return;
    const nextTags = currentTags.filter(t => t !== tagToRemove);
    setInputValue(nextTags.join(', '));
  };

  const applyTags = async () => {
    if (isSaving || isLoading) return;
    try {
      await updateProductTags({
        variables: {
          slug,
          input: {
            tagNames: Array.from(new Set(currentTags)),
          },
        },
      });
    } catch (error) {
      console.error('mutation failed:', error);
    }
  };

  return {
    inputValue: currentInputValue,
    tags: currentTags,
    handleInputChange,
    removeTag,
    applyTags,
    isSaving,
    isLoading,
  };
}
