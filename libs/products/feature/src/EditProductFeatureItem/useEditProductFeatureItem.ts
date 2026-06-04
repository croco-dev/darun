'use client';

import { gql } from '@apollo/client';
import { useApolloClient } from '@apollo/client/react';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useEffect } from 'react';
import { TempProductBySlugOnProductFeatureTableDocument } from '../ProductFeatureTable/__generated__/useProductFeatureTable';
import {
  useFeatureOnEditProductFeatureItemQuery,
  useUpdateProductFeatureOnEditProductFeatureItemMutation,
} from './__generated__/useEditProductFeatureItem';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
gql`
  query FeatureOnEditProductFeatureItem($id: ID!) {
    feature(id: $id) {
      id
      emoji
      name
      summary
    }
  }

  mutation UpdateProductFeatureOnEditProductFeatureItem($input: UpdateProductFeatureInput!, $featureId: String!) {
    updateProductFeature(input: $input, id: $featureId) {
      feature {
        id
      }
    }
  }
`;

type EditProductFeatureItemProps = { featureId: string; onSubmit?: () => void };

type FormValues = {
  emoji?: string;
  name?: string;
  summary?: string;
};

export function useEditProductFeatureItem({ featureId, onSubmit }: EditProductFeatureItemProps) {
  const apolloClient = useApolloClient();

  const { data, loading: queryLoading } = useFeatureOnEditProductFeatureItemQuery({
    variables: { id: featureId },
  });
  const [updateFeature, { loading: mutationLoading }] = useUpdateProductFeatureOnEditProductFeatureItemMutation({
    onCompleted: async ({ updateProductFeature }) => {
      if (updateProductFeature) {
        await apolloClient.refetchQueries({
          include: [TempProductBySlugOnProductFeatureTableDocument],
        });
        notifications.show({ message: '수정되었습니다.', color: 'teal' });
        onSubmit?.();
      }
    },
    onError: error => {
      notifications.show({ message: error.message, color: 'red' });
    },
  });

  const form = useForm<FormValues>({
    mode: 'uncontrolled',
    initialValues: {
      emoji: '',
      name: '',
      summary: '',
    },
  });

  useEffect(() => {
    const feature = data?.feature;
    if (!feature?.id) {
      return;
    }

    form.setValues({
      emoji: feature.emoji,
      name: feature.name,
      summary: feature.summary ?? '',
    });
  }, [data, form]);

  const submit = async (values: FormValues) => {
    if (!values.name && !values.summary && !values.emoji) {
      notifications.show({
        message: '모든 값이 비어있을 수는 없습니다.',
        color: 'red',
      });
      return;
    }

    await updateFeature({
      variables: {
        featureId,
        input: {
          emoji: values.emoji,
          name: values.name,
          summary: values.summary,
        },
      },
    });
  };

  return { loading: queryLoading || mutationLoading, form, submit };
}
