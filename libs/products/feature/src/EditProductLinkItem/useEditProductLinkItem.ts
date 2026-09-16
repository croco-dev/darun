'use client';

import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import {
  EditProductLinkItemFragment,
  TempProductBySlugOnProductLinkTableDocument,
  UpdateProductLinkOnEditProductLinkItemDocument,
} from '@darun/provider-graphql';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useEffect } from 'react';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
gql`
  mutation UpdateProductLinkOnEditProductLinkItem($slug: String!, $id: String!, $input: UpdateProductLinkInput!) {
    updateProductLink(slug: $slug, id: $id, input: $input) {
      product {
        id
        ...ProductLinkTable
      }
    }
  }
`;

type EditProductLinkItemProps = {
  slug: string;
  link: EditProductLinkItemFragment;
  onSubmit?: () => void;
};

type FormValues = {
  title?: string;
  link?: string;
  displayLink?: string;
  iconUrl?: string;
};

export function useEditProductLinkItem({ slug, link, onSubmit }: EditProductLinkItemProps) {
  const [updateLink, { loading }] = useMutation(UpdateProductLinkOnEditProductLinkItemDocument, {
    refetchQueries: [TempProductBySlugOnProductLinkTableDocument],
    awaitRefetchQueries: true,
    onCompleted: () => {
      notifications.show({ message: '수정되었습니다.', color: 'teal' });
      onSubmit?.();
    },
    onError: error => {
      notifications.show({ message: error.message, color: 'red' });
    },
  });

  const form = useForm<FormValues>({
    mode: 'uncontrolled',
    initialValues: {
      title: link.title,
      link: link.link,
      displayLink: link.displayLink,
      iconUrl: link.iconUrl,
    },
    validate: {
      link: value => {
        if (value?.trim() && !/^https?:\/\//i.test(value.trim())) {
          return '올바른 URL 형식(http:// 또는 https://)으로 입력해주세요.';
        }
        return null;
      },
    },
  });

  useEffect(() => {
    const values = {
      title: link.title,
      link: link.link,
      displayLink: link.displayLink,
      iconUrl: link.iconUrl,
    };
    form.setInitialValues(values);
    form.setValues(values);
  }, [link, form]);

  const submit = async (values: FormValues) => {
    if (loading) return;
    const title = values.title?.trim();
    const linkUrl = values.link?.trim();
    const displayLink = values.displayLink?.trim();
    const iconUrl = values.iconUrl?.trim();

    if (!title && !linkUrl && !displayLink && !iconUrl) {
      notifications.show({
        message: '모든 값이 비어있을 수는 없습니다.',
        color: 'red',
      });
      return;
    }

    if (linkUrl && !/^https?:\/\//i.test(linkUrl)) {
      notifications.show({
        message: '올바른 URL 형식(http:// 또는 https://)으로 입력해주세요.',
        color: 'red',
      });
      return;
    }

    try {
      await updateLink({
        variables: {
          slug,
          id: link.id,
          input: {
            title: title || undefined,
            link: linkUrl || undefined,
            displayLink: displayLink || undefined,
            iconUrl: iconUrl || undefined,
          },
        },
      });
    } catch {
      // Handled by onError callback
    }
  };

  return { form, submit, loading };
}
