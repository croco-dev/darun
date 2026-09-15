'use client';

import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { AllProductsOnProductListTableDocument, CreateProductOnNewProductFormDocument } from '@darun/provider-graphql';
import { useImageUpload } from '@darun/utils-image-upload';
import { useNavigate } from '@darun/utils-router';
import { useForm, UseFormReturnType } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { ReactNode, useState } from 'react';

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
  children: (props: { form: UseFormReturnType<FormValues>; loading: boolean }) => ReactNode;
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
    validate: {
      name: value => (!value?.trim() ? '서비스 이름을 입력해주세요.' : null),
      slug: value => (!value?.trim() ? '슬러그를 입력해주세요.' : null),
      summary: value => (!value?.trim() ? '짧은 설명을 입력해주세요.' : null),
      file: value => (!value ? '로고 이미지를 첨부해주세요.' : null),
    },
  });
  const navigate = useNavigate();
  const { upload } = useImageUpload();
  const [isUploading, setIsUploading] = useState(false);
  const [createProduct, { loading: isCreating }] = useMutation(CreateProductOnNewProductFormDocument, {
    refetchQueries: [AllProductsOnProductListTableDocument],
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
      setIsUploading(true);
      url = await upload('images/logos', values.file, slug);
    } catch {
      notifications.show({
        title: '업로드 실패',
        message: '이미지 업로드에 실패했습니다.',
        color: 'red',
      });
      return;
    } finally {
      setIsUploading(false);
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
    }
  };

  return { form, children, submit, loading: isUploading || isCreating };
}
