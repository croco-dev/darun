'use client';

import { gql } from '@apollo/client';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { isProductFeatureTextTooLong, PRODUCT_FEATURE_TEXT_LIMITS } from '@darun/products-domain/feature-text';
import {
  CreateProductFeatureOnNewProductFeatureFormDocument,
  TempProductBySlugOnProductFeatureTableDocument,
} from '@darun/provider-graphql';
import { notifySavedWithRefresh } from '@darun/ui-admin';
import { useNavigate } from '@darun/utils-router';
import { useForm, UseFormReturnType } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { ReactNode, useRef } from 'react';

gql`
  mutation CreateProductFeatureOnNewProductFeatureForm($input: CreateProductFeatureInput!) {
    createProductFeature(input: $input) {
      feature {
        id
        name
      }
    }
  }
`;

type FormValues = {
  name?: string;
  emoji?: string;
  summary?: string;
};
type NewProductFormProps = {
  productSlug: string;
  children: (props: {
    form: UseFormReturnType<FormValues>;
    pickEmoji: (emoji: { native: string }) => void;
    loading: boolean;
  }) => ReactNode;
};

export function useNewProductFeatureForm({ productSlug, children }: NewProductFormProps) {
  const navigate = useNavigate();
  const client = useApolloClient();
  const isSubmittingRef = useRef(false);
  const form = useForm<FormValues>({
    mode: 'uncontrolled',
    initialValues: {
      name: '',
      emoji: '',
      summary: '',
    },
    validate: {
      name: value => {
        const name = value?.trim();
        if (!name) return '이름을 입력해주세요.';
        return isProductFeatureTextTooLong('name', name)
          ? `이름은 ${PRODUCT_FEATURE_TEXT_LIMITS.name}자 이내로 입력해 주세요.`
          : null;
      },
      emoji: value => (!value?.trim() ? '이모지를 선택해주세요.' : null),
      summary: value => {
        const summary = value?.trim();
        if (!summary) return '짧은 설명을 입력해주세요.';
        return isProductFeatureTextTooLong('summary', summary)
          ? `짧은 설명은 ${PRODUCT_FEATURE_TEXT_LIMITS.summary}자 이내로 입력해 주세요.`
          : null;
      },
    },
  });
  const [createProductFeature, { loading: isCreating }] = useMutation(
    CreateProductFeatureOnNewProductFeatureFormDocument,
    {
      onCompleted: ({ createProductFeature }) => {
        if (createProductFeature?.feature?.id) {
          notifySavedWithRefresh(() =>
            client.query({
              query: TempProductBySlugOnProductFeatureTableDocument,
              variables: { slug: productSlug },
              fetchPolicy: 'network-only',
            })
          );
          form.reset();
          navigate(`/products/${encodeURIComponent(productSlug)}`);
        }
      },
      onError: error => {
        isSubmittingRef.current = false;
        notifications.show({ message: error.message, color: 'red' });
      },
    }
  );

  const pickEmoji = (emoji: { native: string }) => {
    form.setFieldValue('emoji', emoji.native);
  };

  const submit = async (values: FormValues) => {
    if (isCreating || isSubmittingRef.current) return;
    const name = values.name?.trim();
    const emoji = values.emoji?.trim();
    const summary = values.summary?.trim();

    if (!name || !emoji || !summary) return;

    isSubmittingRef.current = true;
    try {
      await createProductFeature({
        variables: {
          input: {
            productSlug,
            name,
            emoji,
            summary,
          },
        },
      });
    } catch {
      // Handled by onError
    }
  };

  return { form, children, submit, pickEmoji, loading: isCreating };
}
