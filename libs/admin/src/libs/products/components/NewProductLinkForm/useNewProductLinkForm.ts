import { gql } from '@apollo/client';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { ReactNode } from 'react';
import { useAddProductLinkOnNewProductLinkFormMutation } from './__generated__/useNewProductLinkForm';

gql`
  mutation AddProductLinkOnNewProductLinkForm($slug: String!, $input: AddProductLinkInput!) {
    addProductLink(slug: $slug, input: $input) {
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
  displayLink?: string;
  iconUrl?: string;
  link?: string;
  title?: string;
};
type NewProductFormProps = {
  productSlug: string;
  children: (props: { form: ReturnType<typeof useForm<FormValues>> }) => ReactNode;
};

export function useNewProductLinkForm({ productSlug, children }: NewProductFormProps) {
  const form = useForm<FormValues>({
    mode: 'uncontrolled',
    initialValues: {
      displayLink: '',
      iconUrl: '',
      link: '',
      title: '',
    },
  });
  const [addProductLink] = useAddProductLinkOnNewProductLinkFormMutation({
    onCompleted: ({ addProductLink }) => {
      if (addProductLink.product?.id) {
        notifications.show({ message: '생성되었습니다.', color: 'teal' });
        form.reset();
      }
    },
  });

  const submit = async (values: FormValues) => {
    if (!values.displayLink || !values.link || !values.title || !values.iconUrl) return;

    await addProductLink({
      variables: {
        slug: productSlug,
        input: {
          displayLink: values.displayLink,
          iconUrl: values.iconUrl,
          link: values.link,
          title: values.title,
        },
      },
    });
  };

  return { form, children, submit };
}
