'use client';

import { gql } from '@apollo/client';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { isProductLinkUrl } from '@darun/products-domain/link';
import {
  AddProductLinkOnNewProductLinkFormDocument,
  TempProductBySlugOnProductLinkTableDocument,
} from '@darun/provider-graphql';
import { notifySavedWithRefresh } from '@darun/ui-admin';
import { useNavigate } from '@darun/utils-router';
import { useForm, UseFormReturnType } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { ReactNode, useRef } from 'react';

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
  const navigate = useNavigate();
  const client = useApolloClient();
  const isSubmittingRef = useRef(false);
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
        return isProductLinkUrl(value.trim()) ? null : '올바른 URL 형식(http:// 또는 https://)으로 입력해주세요.';
      },
      title: value => (!value?.trim() ? '이름을 입력해주세요.' : null),
      iconUrl: value => (!value ? '아이콘을 선택해주세요.' : null),
    },
  });
  const [addProductLink, { loading }] = useMutation(AddProductLinkOnNewProductLinkFormDocument, {
    onCompleted: ({ addProductLink }) => {
      if (addProductLink?.product?.id) {
        const queries = [...client.getObservableQueries([TempProductBySlugOnProductLinkTableDocument])];
        notifySavedWithRefresh(() => Promise.all(queries.map(query => query.refetch())));
        form.reset();
        navigate(`/products/${encodeURIComponent(productSlug)}`);
      }
    },
    onError: error => {
      isSubmittingRef.current = false;
      notifications.show({ message: error.message, color: 'red' });
    },
  });

  const submit = async (values: FormValues) => {
    const displayLink = values.displayLink?.trim();
    const link = values.link?.trim();
    const title = values.title?.trim();
    const iconUrl = values.iconUrl?.trim();
    if (loading || isSubmittingRef.current || !displayLink || !link || !title || !iconUrl) return;
    if (!isProductLinkUrl(link)) {
      notifications.show({
        message: '올바른 URL 형식(http:// 또는 https://)으로 입력해주세요.',
        color: 'red',
      });
      return;
    }

    isSubmittingRef.current = true;
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
