'use client';

import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { AddProductScreenshotOnNewProductScreenshotFormDocument } from '@darun/provider-graphql';
import { useImageUpload } from '@darun/utils-image-upload';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { ReactNode } from 'react';

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
  children: (props: { form: ReturnType<typeof useForm<FormValues>> }) => ReactNode;
};

export function useNewProductScreenshotForm({ productSlug, children }: NewProductFormProps) {
  const form = useForm<FormValues>({
    mode: 'uncontrolled',
    initialValues: {
      file: undefined,
      imageAlt: '',
    },
  });
  const { upload } = useImageUpload();

  const [createProductFeature] = useMutation(AddProductScreenshotOnNewProductScreenshotFormDocument, {
    onCompleted: ({ addProductScreenshot }) => {
      if (addProductScreenshot.product?.id) {
        notifications.show({ message: '생성되었습니다.', color: 'teal' });
        form.reset();
      }
    },
    onError: error => {
      notifications.show({ message: error.message, color: 'red' });
    },
  });

  const submit = async (values: FormValues) => {
    if (!values.file || !values.imageAlt) return;

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
  };

  return { form, children, submit };
}
