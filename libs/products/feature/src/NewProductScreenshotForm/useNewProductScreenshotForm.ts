'use client';

import { gql } from '@apollo/client';
import { useApolloClient, useMutation } from '@apollo/client/react';
import {
  AddProductScreenshotOnNewProductScreenshotFormDocument,
  GetProductScreenshotsOnDetailSectionDocument,
} from '@darun/provider-graphql';
import { notifySavedWithRefresh } from '@darun/ui-admin';
import { useImageUpload } from '@darun/utils-image-upload';
import { useNavigate } from '@darun/utils-router';
import { useForm, UseFormReturnType } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

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

const PLATFORM_OPTIONS = ['', 'WEB', 'IOS', 'ANDROID'] as const;
const SCREEN_TYPE_OPTIONS = [
  '',
  'HOME',
  'ONBOARDING',
  'SIGN_UP',
  'SIGN_IN',
  'SEARCH',
  'LIST',
  'DETAIL',
  'CHECKOUT',
  'SETTINGS',
  'OTHER',
] as const;

type FormValues = {
  file?: File;
  imageAlt?: string;
  title?: string;
  platform?: (typeof PLATFORM_OPTIONS)[number];
  screenType?: (typeof SCREEN_TYPE_OPTIONS)[number];
};
type NewProductFormProps = {
  productSlug: string;
  children: (props: {
    form: UseFormReturnType<FormValues>;
    loading: boolean;
    isUploading: boolean;
    cancelUpload: () => void;
  }) => ReactNode;
};

function validateImageAlt(value: string | undefined) {
  const length = value?.trim().length ?? 0;
  return length < 1 || length > 100 ? '이미지 대체 텍스트(alt)는 1자 이상 100자 이하로 입력해주세요.' : null;
}

export function useNewProductScreenshotForm({ productSlug, children }: NewProductFormProps) {
  const isSubmittingRef = useRef(false);
  const mounted = useRef(true);
  const activeUpload = useRef<AbortController | null>(null);
  const completedUpload = useRef<{ file: File; folder: string; url: string } | null>(null);
  const selectedFile = useRef<File | undefined>(undefined);
  const [isUploading, setIsUploading] = useState(false);
  const cancelUpload = useCallback(() => {
    const controller = activeUpload.current;
    if (!controller) return;
    activeUpload.current = null;
    controller.abort();
    isSubmittingRef.current = false;
    setIsUploading(false);
  }, []);
  const navigate = useNavigate();
  const client = useApolloClient();
  useEffect(() => {
    completedUpload.current = null;
    cancelUpload();
  }, [productSlug, cancelUpload]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      activeUpload.current?.abort();
      activeUpload.current = null;
    };
  }, []);
  const form = useForm<FormValues>({
    mode: 'uncontrolled',
    onValuesChange: values => {
      if (values.file !== selectedFile.current) {
        selectedFile.current = values.file;
        completedUpload.current = null;
        cancelUpload();
      }
    },
    initialValues: {
      file: undefined,
      imageAlt: '',
      title: '',
      platform: '',
      screenType: '',
    },
    validate: {
      file: value => (!value ? '이미지를 선택해주세요.' : null),
      imageAlt: validateImageAlt,
      title: value => (value && value.trim().length > 100 ? '제목은 100자 이하로 입력해주세요.' : null),
      platform: value => (value && !PLATFORM_OPTIONS.includes(value) ? '지원하지 않는 플랫폼 값입니다.' : null),
      screenType: value => (value && !SCREEN_TYPE_OPTIONS.includes(value) ? '지원하지 않는 화면 유형 값입니다.' : null),
    },
  });
  const { upload } = useImageUpload();

  const [addProductScreenshot, { loading: isAdding }] = useMutation(
    AddProductScreenshotOnNewProductScreenshotFormDocument,
    {
      onCompleted: ({ addProductScreenshot }) => {
        if (mounted.current && addProductScreenshot?.product?.id) {
          notifySavedWithRefresh(() =>
            client.query({
              query: GetProductScreenshotsOnDetailSectionDocument,
              variables: { slug: productSlug },
              fetchPolicy: 'network-only',
            })
          );
          completedUpload.current = null;
          isSubmittingRef.current = false;
          form.reset();
          navigate(`/products/${encodeURIComponent(productSlug)}`);
        }
      },
      onError: error => {
        if (!mounted.current) return;
        isSubmittingRef.current = false;
        notifications.show({ message: error.message, color: 'red' });
      },
    }
  );

  const submit = async (values: FormValues) => {
    if (!mounted.current || isUploading || isAdding || isSubmittingRef.current) return;
    const imageAltError = validateImageAlt(values.imageAlt);
    if (imageAltError) {
      form.setFieldError('imageAlt', imageAltError);
      return;
    }
    if (!values.file || !values.imageAlt?.trim()) {
      notifications.show({
        message: '이미지와 설명(alt)을 모두 입력해주세요.',
        color: 'red',
      });
      return;
    }

    isSubmittingRef.current = true;
    const controller = new AbortController();
    activeUpload.current = controller;
    const folder = `images/screenshots/${productSlug}`;
    let url =
      completedUpload.current?.file === values.file && completedUpload.current.folder === folder
        ? completedUpload.current.url
        : undefined;
    try {
      if (!url) {
        setIsUploading(true);
        url = await upload(folder, values.file, values.file.name, controller.signal);
      }
    } catch {
      if (!mounted.current || activeUpload.current !== controller || controller.signal.aborted) return;
      activeUpload.current = null;
      isSubmittingRef.current = false;
      setIsUploading(false);
      notifications.show({
        message: '이미지 업로드에 실패했어요.',
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

    completedUpload.current = { file: values.file, folder, url };

    try {
      await addProductScreenshot({
        variables: {
          slug: productSlug,
          input: {
            imageUrl: url,
            imageAlt: values.imageAlt.trim(),
            title: values.title?.trim() ? values.title.trim() : null,
            platform: values.platform ? values.platform : null,
            screenType: values.screenType ? values.screenType : null,
          },
        },
      });
    } catch {
      // Handled by onError
    }
  };

  return {
    form,
    children,
    submit,
    cancelUpload,
    isUploading,
    loading: isUploading || isAdding,
  };
}
