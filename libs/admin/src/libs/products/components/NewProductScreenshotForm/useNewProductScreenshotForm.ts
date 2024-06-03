import { gql } from '@apollo/client';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { ReactNode } from 'react';
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
  imageUrl?: string;
  imageAlt?: string;
};
type NewProductFormProps = {
  productSlug: string;
  children: (props: { form: ReturnType<typeof useForm<FormValues>> }) => ReactNode;
};

export function useNewProductScreenshotForm({ productSlug, children }: NewProductFormProps) {
  const form = useForm<FormValues>({
    initialValues: {
      imageUrl: '',
      imageAlt: '',
    },
  });
  const [createProductFeature] = useAddProductScreenshotOnNewProductScreenshotFormMutation({
    onCompleted: ({ addProductScreenshot }) => {
      if (addProductScreenshot.product?.id) {
        notifications.show({ message: '생성되었습니다.', color: 'teal' });
        form.reset();
      }
    },
  });

  const submit = async (values: FormValues) => {
    if (!values.imageUrl || !values.imageAlt) return;

    await createProductFeature({
      variables: {
        slug: productSlug,
        input: {
          imageUrl: values.imageUrl,
          imageAlt: values.imageAlt,
        },
      },
    });
  };

  return { form, children, submit };
}
