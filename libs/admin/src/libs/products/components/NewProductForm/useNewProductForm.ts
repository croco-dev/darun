import { gql } from '@apollo/client';
import { useNavigate } from '@darun/utils-router';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { ReactNode } from 'react';
import { useCreateProductOnNewProductFormMutation } from './__generated__/useNewProductForm';

gql`
  mutation CreateProductOnNewProductForm($input: CreateProductInput!) {
    createProduct(input: $input) {
      product {
        id
        slug
      }
    }
  }
`;

type FormValues = {
  name?: string;
  slug?: string;
  summary?: string;
  logoUrl?: string;
};
type NewProductFormProps = {
  children: (props: { form: ReturnType<typeof useForm<FormValues>> }) => ReactNode;
};

export function useNewProductForm({ children }: NewProductFormProps) {
  const form = useForm<FormValues>({
    initialValues: {
      name: '',
      slug: '',
      summary: '',
      logoUrl: '',
    },
  });
  const navigate = useNavigate();
  const [createProduct] = useCreateProductOnNewProductFormMutation({
    onCompleted: ({ createProduct }) => {
      if (createProduct.product.slug) {
        notifications.show({ message: '생성되었습니다.', color: 'teal' });
        form.reset();
        navigate(`/products/${createProduct.product.slug}`);
      }
    },
  });

  const submit = async (values: FormValues) => {
    if (!values.name || !values.slug || !values.summary || !values.logoUrl) return;

    await createProduct({
      variables: {
        input: {
          name: values.name,
          slug: values.slug,
          summary: values.summary,
          logoUrl: values.logoUrl,
        },
      },
    });
  };

  return { form, children, submit };
}
