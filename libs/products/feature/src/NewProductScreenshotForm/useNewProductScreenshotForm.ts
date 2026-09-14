'use client';

import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { AddProductScreenshotOnNewProductScreenshotFormDocument } from '@darun/provider-graphql';
import { useImageUpload } from '@darun/utils-image-upload';
import { useForm, UseFormReturnType } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { ReactNode, useRef, useState } from 'react';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
gql`
  mutation AddProductScreenshotOnNewProductScreenshotForm($slug: String!, $input: AddProductScreenshotInput!) {
    addProductScreenshot(slug: $slug, input: $input) {
      product {
        id
        screenshots {
          id
          imageAlt
          imageUrl
        }
      }
    }
  }
`;

type FormValues = {
  file?: File;
  imageAlt?: string;
};
type NewProductFormProps = {
  productSlug: string;
  children: (props: { form: UseFormReturnType<FormValues>; loading: boolean }) => ReactNode;
};

export function useNewProductScreenshotForm({ productSlug, children }: NewProductFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const form = useForm<FormValues>({
    mode: 'uncontrolled',
    initialValues: {
      file: undefined,
      imageAlt: '',
    },
  });
  const { upload } = useImageUpload();

  const [createProductFeature, { loading: isMutating }] = useMutation(
    AddProductScreenshotOnNewProductScreenshotFormDocument,
    {
      onCompleted: ({ addProductScreenshot }) => {
        if (addProductScreenshot.product?.id) {
          notifications.show({ message: '생성되었습니다.', color: 'teal' });
          form.reset();
        }
      },
      onError: error => {
        notifications.show({ message: error.message, color: 'red' });
      },
    }
  );
  const loading = isSubmitting || isMutating;

  const submit = async (values: FormValues) => {
    if (isSubmittingRef.current || loading || !values.file || !values.imageAlt) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      const url = await upload(`images/screenshots/${productSlug}`, values.file, values.file.name);

      if (!url) {
        notifications.show({
          message: '이미지 업로드에 실패했어요.',
          color: 'red',
        });
        return;
      }

      await createProductFeature({
        variables: {
          slug: productSlug,
          input: {
            imageUrl: url,
            imageAlt: values.imageAlt,
          },
        },
      });
    } catch (error) {
      notifications.show({
        message: error instanceof Error ? error.message : '스크린샷 등록에 실패했어요.',
        color: 'red',
      });
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  return { form, children, submit, loading };
}
