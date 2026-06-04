import { gql } from '@apollo/client';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { ProductLinkTableFragmentDoc } from '../ProductLinkTable/__generated__/ProductLinkTable';
import { EditProductLinkItemFragment } from './__generated__/EditProductLinkItem';
import { useUpdateProductLinkOnEditProductLinkItemMutation } from './__generated__/useEditProductLinkItem';

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

  ${ProductLinkTableFragmentDoc}
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
  const [updateLink, { loading }] = useUpdateProductLinkOnEditProductLinkItemMutation({
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
  });

  const submit = async (values: FormValues) => {
    if (!values.title && !values.link && !values.displayLink && !values.iconUrl) {
      notifications.show({
        message: '모든 값이 비어있을 수는 없습니다.',
        color: 'red',
      });
      return;
    }

    await updateLink({
      variables: {
        slug,
        id: link.id,
        input: {
          title: values.title,
          link: values.link,
          displayLink: values.displayLink,
          iconUrl: values.iconUrl,
        },
      },
    });

    notifications.show({ message: '수정되었습니다.', color: 'teal' });
    if (onSubmit) {
      onSubmit();
    }
  };

  return { form, submit, loading };
}
