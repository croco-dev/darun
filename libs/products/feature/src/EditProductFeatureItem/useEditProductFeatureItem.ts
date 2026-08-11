'use client';

import { gql } from '@apollo/client';
import { useApolloClient } from '@apollo/client/react';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  FeatureOnEditProductFeatureItemDocument,
  TempProductBySlugOnProductFeatureTableDocument,
  UpdateProductFeatureOnEditProductFeatureItemDocument,
} from '@darun/provider-graphql';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useEffect } from 'react';

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

  const { data, loading: queryLoading } = useQuery(FeatureOnEditProductFeatureItemDocument, {
    variables: { id: featureId },
  });
  const [updateFeature, { loading: mutationLoading }] = useMutation(UpdateProductFeatureOnEditProductFeatureItemDocument, {
    refetchQueries: [TempProductBySlugOnProductFeatureTableDocument],
    awaitRefetchQueries: true,
    onCompleted: () => {
      notifications.show({ message: '수정되었습니다.', color: 'teal' });
      apolloClient.cache.evict({ fieldName: 'feature' });
      onSubmit?.();
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
    form.setValues({
      emoji: data?.feature?.emoji ?? '',
      name: data?.feature?.name ?? '',
      summary: data?.feature?.summary ?? '',
    });
  }, [data, form]);

  const submit = async (values: FormValues) => {
    if (!values.emoji || !values.name || !values.summary) {
      notifications.show({ message: '값을 입력해주세요!!', color: 'red' });
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
