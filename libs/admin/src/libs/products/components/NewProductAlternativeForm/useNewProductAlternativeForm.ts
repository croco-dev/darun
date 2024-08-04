import { gql } from '@apollo/client';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { ReactNode } from 'react';
import { useAddAlternativeProductOnNewProductAlternativeFormMutation } from './__generated__/useNewProductAlternativeForm';

gql`
  mutation AddAlternativeProductOnNewProductAlternativeForm($slug: String!, $input: AddAlternativeProductInput!) {
    addAlternativeProduct(slug: $slug, input: $input) {
      product {
        id
        alternatives {
          id
        }
      }
    }
  }
`;

type FormValues = {
  productId?: string;
};
type NewProductAlternativeFormProps = {
  productSlug: string;
  children: (props: { form: ReturnType<typeof useForm<FormValues>> }) => ReactNode;
};

export function useNewProductAlternativeForm({ productSlug, children }: NewProductAlternativeFormProps) {
  const form = useForm<FormValues>({
    initialValues: {
      productId: '',
    },
  });
  const [addAlternativeProduct] = useAddAlternativeProductOnNewProductAlternativeFormMutation({
    onCompleted: ({ addAlternativeProduct }) => {
      if (addAlternativeProduct.product?.alternatives.length) {
        notifications.show({ message: '생성되었습니다.', color: 'teal' });
        form.reset();
      }
    },
  });

  const submit = async (values: FormValues) => {
    if (!values.productId) return;

    await addAlternativeProduct({
      variables: {
        slug: productSlug,
        input: {
          alternativeProductId: values.productId,
        },
      },
    });
  };

  return { form, children, submit };
}
