'use client';

import { gql } from '@apollo/client';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { AllProductsOnProductListTableDocument, CreateProductOnNewProductFormDocument } from '@darun/provider-graphql';
import { notifySavedWithRefresh } from '@darun/ui-admin';
import { useImageUpload } from '@darun/utils-image-upload';
import { useNavigate } from '@darun/utils-router';
import { useForm, UseFormReturnType } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { ReactNode, useEffect, useRef, useState } from 'react';

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
  children: (props: {
    form: UseFormReturnType<FormValues>;
    loading: boolean;
    isUploading: boolean;
    cancelUpload: () => void;
  }) => ReactNode;
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
      slug: value => {
        if (!value?.trim()) return '슬러그를 입력해주세요.';
        if (/\s/.test(value.trim())) return '슬러그에는 공백(띄어쓰기)을 포함할 수 없습니다.';
        return null;
      },
      summary: value => (!value?.trim() ? '짧은 설명을 입력해주세요.' : null),
      file: value => (!value ? '로고 이미지를 첨부해주세요.' : null),
    },
  });
  const navigate = useNavigate();
  const client = useApolloClient();
  const isSubmittingRef = useRef(false);
  const mounted = useRef(true);
  const activeUpload = useRef<AbortController | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      activeUpload.current?.abort();
      activeUpload.current = null;
    };
  }, []);
  const { upload } = useImageUpload();
  const [isUploading, setIsUploading] = useState(false);
  const [createProduct, { loading: isCreating }] = useMutation(CreateProductOnNewProductFormDocument, {
    onCompleted: ({ createProduct }) => {
      if (mounted.current && createProduct?.product?.slug) {
        const queries = [...client.getObservableQueries([AllProductsOnProductListTableDocument])];
        notifySavedWithRefresh(() => Promise.all(queries.map(query => query.refetch())));
        form.reset();
        navigate(`/products/${encodeURIComponent(createProduct.product.slug)}`);
      }
    },
    onError: error => {
      if (!mounted.current) return;
      isSubmittingRef.current = false;
      notifications.show({
        title: '오류 발생',
        message: error.message,
        color: 'red',
      });
    },
  });

  const cancelUpload = () => {
    const controller = activeUpload.current;
    if (!controller) return;
    activeUpload.current = null;
    controller.abort();
    isSubmittingRef.current = false;
    setIsUploading(false);
  };

  const submit = async (values: FormValues) => {
    if (!mounted.current || isUploading || isCreating || isSubmittingRef.current) return;
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
    const controller = new AbortController();
    activeUpload.current = controller;
    let url: string | undefined;
    try {
      setIsUploading(true);
      url = await upload('images/logos', values.file, slug, controller.signal);
    } catch {
      if (!mounted.current || activeUpload.current !== controller || controller.signal.aborted) return;
      activeUpload.current = null;
      isSubmittingRef.current = false;
      setIsUploading(false);
      notifications.show({
        title: '업로드 실패',
        message: '이미지 업로드에 실패했습니다.',
        color: 'red',
      });
      return;
    } finally {
      if (mounted.current && activeUpload.current === controller) {
        setIsUploading(false);
      }
    }

    if (!mounted.current || activeUpload.current !== controller || controller.signal.aborted) return;
    activeUpload.current = null;
    if (!url) {
      isSubmittingRef.current = false;
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

  return {
    form,
    children,
    submit,
    cancelUpload,
    isUploading,
    loading: isUploading || isCreating,
  };
}
