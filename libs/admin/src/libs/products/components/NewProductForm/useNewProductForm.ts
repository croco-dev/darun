import { gql } from '@apollo/client';
import { useNavigate } from '@darun/utils-router';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { ReactNode } from 'react';
import { useImageUpload } from '../../../utils/useImageUplaod';
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
  logoName?: string;
  file?: File;
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
      logoName: '',
      file: undefined,
    },
  });
  const navigate = useNavigate();
  const { upload } = useImageUpload();
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
    if (!values.name || !values.slug || !values.summary || !values.file || !values.logoName) return;

    const url = await upload('images/logos', values.file, values.logoName);

    if (!url) {
      notifications.show({ message: '이미지 업로드에 실패했어요.', color: 'red' });
      return;
    }
    await createProduct({
      variables: {
        input: {
          name: values.name,
          slug: values.slug,
          summary: values.summary,
          logoUrl: url,
        },
      },
    });
  };

  return { form, children, submit };
}
