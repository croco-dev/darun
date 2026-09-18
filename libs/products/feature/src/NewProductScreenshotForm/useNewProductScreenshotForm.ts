'use client';

import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import {
  AddProductScreenshotOnNewProductScreenshotFormDocument,
  GetProductScreenshotsOnDetailSectionDocument,
} from '@darun/provider-graphql';
import { useImageUpload } from '@darun/utils-image-upload';
import { useNavigate } from '@darun/utils-router';
import { useForm, UseFormReturnType } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useState, type ReactNode } from 'react';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
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
  children: (props: { form: UseFormReturnType<FormValues>; loading: boolean }) => ReactNode;
};

export function useNewProductScreenshotForm({ productSlug, children }: NewProductFormProps) {
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const form = useForm<FormValues>({
    mode: 'uncontrolled',
    initialValues: {
      file: undefined,
      imageAlt: '',
      title: '',
      platform: '',
      screenType: '',
    },
    validate: {
      file: value => (!value ? '이미지를 선택해주세요.' : null),
      imageAlt: value => (!value?.trim() ? '이미지 대체 텍스트(alt)를 입력해주세요.' : null),
      title: value => (value && value.trim().length > 100 ? '제목은 100자 이하로 입력해주세요.' : null),
      platform: value => (value && !PLATFORM_OPTIONS.includes(value) ? '지원하지 않는 플랫폼 값입니다.' : null),
      screenType: value => (value && !SCREEN_TYPE_OPTIONS.includes(value) ? '지원하지 않는 화면 유형 값입니다.' : null),
    },
  });
  const { upload } = useImageUpload();

  const [addProductScreenshot, { loading: isAdding }] = useMutation(
    AddProductScreenshotOnNewProductScreenshotFormDocument,
    {
      refetchQueries: [{ query: GetProductScreenshotsOnDetailSectionDocument, variables: { slug: productSlug } }],
      awaitRefetchQueries: true,
      onCompleted: ({ addProductScreenshot }) => {
        if (addProductScreenshot.product?.id) {
          notifications.show({ message: '생성되었습니다.', color: 'teal' });
          form.reset();
          navigate(`/products/${productSlug}`);
        }
      },
      onError: error => {
        notifications.show({ message: error.message, color: 'red' });
      },
    }
  );

  const submit = async (values: FormValues) => {
    if (isUploading || isAdding) return;
    if (!values.file || !values.imageAlt?.trim()) {
      notifications.show({
        message: '이미지와 설명(alt)을 모두 입력해주세요.',
        color: 'red',
      });
      return;
    }

    let url: string | undefined;
    try {
      setIsUploading(true);
      url = await upload(`images/screenshots/${productSlug}`, values.file, values.file.name);
    } catch {
      notifications.show({
        message: '이미지 업로드에 실패했어요.',
        color: 'red',
      });
      return;
    } finally {
      setIsUploading(false);
    }

    if (!url) {
      notifications.show({
        message: '이미지 업로드에 실패했어요.',
        color: 'red',
      });
      return;
    }

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

  return { form, children, submit, loading: isUploading || isAdding };
}
