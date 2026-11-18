'use client';

import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { isProductLinkUrl } from '@darun/products-domain/link';
import {
  EditProductLinkItemFragment,
  type ProductLinkRole,
  type UpdateProductLinkInput,
  UpdateProductLinkOnEditProductLinkItemDocument,
} from '@darun/provider-graphql';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useCallback, useEffect, useRef } from 'react';

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

export type EditProductLinkItemProps = {
  slug: string;
  link: EditProductLinkItemFragment;
  onSubmit?: () => void;
  onCancel?: () => void;
};

type FormValues = {
  title?: string;
  link?: string;
  displayLink?: string;
  iconUrl?: string;
  role?: ProductLinkRole | '';
  makePrimary?: boolean;
};

function getLinkChanges(values: FormValues, initial: FormValues): UpdateProductLinkInput {
  const input: UpdateProductLinkInput = {};
  const title = values.title?.trim();
  if (title !== undefined && title !== initial.title?.trim()) input.title = title;
  for (const key of ['link', 'displayLink', 'iconUrl'] as const) {
    const value = values[key]?.trim();
    if (value && value !== initial[key]?.trim()) input[key] = value;
  }
  if (values.role !== undefined && values.role !== initial.role) input.role = values.role || null;
  if (values.makePrimary) input.makePrimary = true;
  return input;
}

export function useEditProductLinkItem({ slug, link, onSubmit, onCancel }: EditProductLinkItemProps) {
  const saving = useRef(false);
  const cancel = useCallback(() => {
    if (!saving.current) onCancel?.();
  }, [onCancel]);
  const [updateLink, { loading }] = useMutation(UpdateProductLinkOnEditProductLinkItemDocument, {
    onCompleted: () => {
      notifications.show({ message: '수정되었습니다.', color: 'teal' });
      onSubmit?.();
    },
    onError: error => {
      notifications.show({ message: error.message, color: 'red' });
    },
  });

  const form = useForm<FormValues>({
    mode: 'controlled',
    initialValues: {
      title: link.title,
      link: link.link,
      displayLink: link.displayLink,
      iconUrl: link.iconUrl,
      role: link.role ?? '',
      makePrimary: false,
    },
    validate: {
      link: value => {
        if (value?.trim() && value.trim() !== link.link.trim() && !isProductLinkUrl(value.trim())) {
          return '올바른 URL 형식(http:// 또는 https://)으로 입력해주세요.';
        }
        return null;
      },
    },
  });

  const initializedLink = useRef({ slug, id: link.id });
  const { setInitialValues, setValues } = form;

  useEffect(() => {
    if (initializedLink.current.slug === slug && initializedLink.current.id === link.id) return;
    initializedLink.current = { slug, id: link.id };
    const values: FormValues = {
      title: link.title,
      link: link.link,
      displayLink: link.displayLink,
      iconUrl: link.iconUrl,
      role: link.role ?? '',
      makePrimary: false,
    };
    setInitialValues(values);
    setValues(values);
  }, [slug, link.id, link.title, link.link, link.displayLink, link.iconUrl, link.role, setInitialValues, setValues]);

  const submit = async (values: FormValues) => {
    if (saving.current) return;
    const input = getLinkChanges(values, form.getInitialValues());

    if (
      !values.title?.trim() &&
      !values.link?.trim() &&
      !values.displayLink?.trim() &&
      !values.iconUrl?.trim() &&
      input.role === undefined &&
      !input.makePrimary
    ) {
      notifications.show({
        message: '모든 값이 비어있을 수는 없습니다.',
        color: 'red',
      });
      return;
    }

    if (input.link && !isProductLinkUrl(input.link)) {
      notifications.show({
        message: '올바른 URL 형식(http:// 또는 https://)으로 입력해주세요.',
        color: 'red',
      });
      return;
    }
    if (!Object.keys(input).length) return;

    saving.current = true;
    try {
      await updateLink({
        variables: {
          slug,
          id: link.id,
          input,
        },
      });
    } catch {
      // Handled by onError callback
    } finally {
      saving.current = false;
    }
  };

  return { form, submit, cancel, loading, changes: getLinkChanges(form.values, form.getInitialValues()) };
}
