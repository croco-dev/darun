'use client';

import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { CreateProductOnNewProductFormDocument } from '@darun/provider-graphql';
import { useImageUpload } from '@darun/utils-image-upload';
import { useNavigate } from '@darun/utils-router';
import { useForm, UseFormReturnType } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { ReactNode, useRef, useState } from 'react';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
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
  const [createProduct, { loading: isMutating }] = useMutation(CreateProductOnNewProductFormDocument, {
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
  const loading = isSubmitting || isMutating;

  const submit = async (values: FormValues) => {
    if (isSubmittingRef.current || loading) {
      return;
    }

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

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      const url = await upload('images/logos', values.file, slug);

      if (!url) {
        notifications.show({
          title: '업로드 실패',
          message: '이미지 업로드에 실패했습니다.',
          color: 'red',
        });
        return;
      }

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
      console.error('submission failed:', error);
      notifications.show({
        title: '생성 실패',
        message: error instanceof Error ? error.message : '상품 생성에 실패했습니다.',
        color: 'red',
      });
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  return { form, children, submit, loading };
}
