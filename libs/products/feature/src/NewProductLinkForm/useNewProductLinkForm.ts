'use client';

import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import {
  AddProductLinkOnNewProductLinkFormDocument,
  TempProductBySlugOnProductLinkTableDocument,
} from '@darun/provider-graphql';
import { useForm, UseFormReturnType } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
gql`
  mutation AddProductLinkOnNewProductLinkForm($slug: String!, $input: AddProductLinkInput!) {
    addProductLink(slug: $slug, input: $input) {
      product {
        id
        links {
          id
          isPrimary
          title
          link
          displayLink
          iconUrl
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
  children: (props: { form: UseFormReturnType<FormValues>; loading: boolean }) => ReactNode;
};

export function useNewProductLinkForm({ productSlug, children }: NewProductFormProps) {
  const router = useRouter();
  const form = useForm<FormValues>({
    mode: 'uncontrolled',
    initialValues: {
      displayLink: '',
      iconUrl: '',
      link: '',
      title: '',
    },
    validate: {
      displayLink: value => (!value?.trim() ? '표시 링크를 입력해주세요.' : null),
      link: value => {
        if (!value?.trim()) return '링크를 입력해주세요.';
        if (!/^https?:\/\//i.test(value.trim())) return '올바른 URL 형식(http:// 또는 https://)으로 입력해주세요.';
        return null;
      },
      title: value => (!value?.trim() ? '이름을 입력해주세요.' : null),
      iconUrl: value => (!value ? '아이콘을 선택해주세요.' : null),
    },
  });
  const [addProductLink, { loading }] = useMutation(AddProductLinkOnNewProductLinkFormDocument, {
    refetchQueries: [TempProductBySlugOnProductLinkTableDocument],
    awaitRefetchQueries: true,
    onCompleted: ({ addProductLink }) => {
      if (addProductLink.product?.id) {
        notifications.show({ message: '생성되었습니다.', color: 'teal' });
        form.reset();
        router.push(`/products/${productSlug}`);
      }
    },
    onError: error => {
      notifications.show({ message: error.message, color: 'red' });
    },
  });

  const submit = async (values: FormValues) => {
    const displayLink = values.displayLink?.trim();
    const link = values.link?.trim();
    const title = values.title?.trim();
    const iconUrl = values.iconUrl?.trim();
    if (loading || !displayLink || !link || !title || !iconUrl) return;
    if (!/^https?:\/\//i.test(link)) {
      notifications.show({
        message: '올바른 URL 형식(http:// 또는 https://)으로 입력해주세요.',
        color: 'red',
      });
      return;
    }

    try {
      await addProductLink({
        variables: {
          slug: productSlug,
          input: {
            displayLink,
            iconUrl,
            link,
            title,
          },
        },
      });
    } catch {
      // Handled in onError
    }
  };

  return { form, children, submit, loading };
}
