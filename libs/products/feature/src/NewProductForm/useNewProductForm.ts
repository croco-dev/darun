'use client';

import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { CreateProductOnNewProductFormDocument } from '@darun/provider-graphql';
import { useImageUpload } from '@darun/utils-image-upload';
import { useNavigate } from '@darun/utils-router';
import { useForm, UseFormReturnType } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { ReactNode } from 'react';

gql(`
  mutation CreateProductOnNewProductForm($input: CreateProductInput!) {
    createProduct(input: $input) {
      product {
        id
        slug
      }
    }
  }
`);

type FormValues = {
  name?: string;
  slug?: string;
  summary?: string;
  file?: File;
};
type NewProductFormProps = {
  children: (props: { form: UseFormReturnType<FormValues> }) => ReactNode;
};

export function useNewProductForm({ children }: NewProductFormProps) {
  const form = useForm<FormValues>({
    mode: 'uncontrolled',
    initialValues: {
      name: '',
      slug: '',
      summary: '',
      file: undefined,
    },
  });
  const navigate = useNavigate();
  const { upload } = useImageUpload();
  const [createProduct] = useMutation(CreateProductOnNewProductFormDocument, {
    onCompleted: ({ createProduct }) => {
      if (createProduct.product.slug) {
        notifications.show({ message: '생성되었습니다.', color: 'teal' });
        form.reset();
        navigate(`/products/${createProduct.product.slug}`);
      }
    },
    onError: error => {
      notifications.show({
        title: '오류 발생',
        message: error.message,
        color: 'red',
      });
    },
  });

  const submit = async (values: FormValues) => {
    const name = values.name?.trim();
    const slug = values.slug?.trim();
    const summary = values.summary?.trim();

    if (!name || !slug || !summary || !values.file) {
      notifications.show({
        message: '이름, 슬러그, 요약, 로고 이미지를 모두 입력해주세요.',
        color: 'red',
      });
      return;
    }

    let url: string | undefined;
    try {
      url = await upload('images/logos', values.file, slug);
    } catch {
      notifications.show({
        title: '업로드 실패',
        message: '이미지 업로드에 실패했습니다.',
        color: 'red',
      });
      return;
    }

    if (!url) {
      return;
    }

    try {
      await createProduct({
        variables: {
          input: {
            name,
            slug,
            summary,
            logoUrl: url,
          },
        },
      });
    } catch (error) {
      console.error('mutation failed:', error);
      throw error;
    }
  };

  return { form, children, submit };
}
