import { gql } from '@apollo/client';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { ReactNode } from 'react';
import { useImageUpload } from '../../../utils/useImageUplaod';
import { useAddProductScreenshotOnNewProductScreenshotFormMutation } from './__generated__/useNewProductScreenshotForm';

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
    initialValues: {
      file: undefined,
      imageAlt: '',
    },
  });
  const { upload } = useImageUpload();

  const [createProductFeature] = useAddProductScreenshotOnNewProductScreenshotFormMutation({
    onCompleted: ({ addProductScreenshot }) => {
      if (addProductScreenshot.product?.id) {
        notifications.show({ message: '생성되었습니다.', color: 'teal' });
        form.reset();
      }
    },
  });

  const submit = async (values: FormValues) => {
    if (!values.file || !values.imageAlt) return;

    const url = await upload(`images/screenshots/${productSlug}`, values.file, values.file.name);

    if (!url) {
      notifications.show({ message: '이미지 업로드에 실패했어요.', color: 'red' });
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
