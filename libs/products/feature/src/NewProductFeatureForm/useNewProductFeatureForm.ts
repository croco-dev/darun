'use client';

import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import {
  CreateProductFeatureOnNewProductFeatureFormDocument,
  TempProductBySlugOnProductFeatureTableDocument,
} from '@darun/provider-graphql';
import { useForm, UseFormReturnType } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
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
  const router = useRouter();
  const form = useForm<FormValues>({
    mode: 'uncontrolled',
    initialValues: {
      name: '',
      emoji: '',
      summary: '',
    },
    validate: {
      name: value => (!value ? '이름을 입력해주세요.' : null),
      emoji: value => (!value ? '이모지를 선택해주세요.' : null),
      summary: value => (!value ? '짧은 설명을 입력해주세요.' : null),
    },
  });
  const [createProductFeature, { loading: isCreating }] = useMutation(
    CreateProductFeatureOnNewProductFeatureFormDocument,
    {
      refetchQueries: [{ query: TempProductBySlugOnProductFeatureTableDocument, variables: { slug: productSlug } }],
      onCompleted: ({ createProductFeature }) => {
        if (createProductFeature.feature.id) {
          notifications.show({ message: '생성되었습니다.', color: 'teal' });
          form.reset();
          router.push(`/products/${productSlug}`);
        }
      },
      onError: error => {
        notifications.show({ message: error.message, color: 'red' });
      },
    }
  );

  const pickEmoji = (emoji: { native: string }) => {
    form.setFieldValue('emoji', emoji.native);
  };

  const submit = async (values: FormValues) => {
    if (!values.name || !values.emoji || !values.summary) return;

    try {
      await createProductFeature({
        variables: {
          input: {
            productSlug,
            name: values.name,
            emoji: values.emoji,
            summary: values.summary,
          },
        },
      });
    } catch {
      // Handled by onError
    }
  };

  return { form, children, submit, pickEmoji, loading: isCreating };
}
