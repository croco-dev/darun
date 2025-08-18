import { gql, useMutation } from '@apollo/client';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { TempProductBySlugOnProductLinkTableDocument } from '../ProductLinkTable/__generated__/useProductLinkTable';

const UPDATE_PRODUCT_LINK_MUTATION = gql`
  mutation UpdateProductLinkOnEditProductLinkItem($slug: String!, $id: String!, $input: UpdateProductLinkInput!) {
    updateProductLink(slug: $slug, id: $id, input: $input) {
      product {
        id
      }
    }
  }
`;

type EditProductLinkItemProps = {
  slug: string;
  link: {
    id: string;
    title: string;
    link: string;
    displayLink: string;
    iconUrl: string;
  };
  onSubmit?: () => void;
};

type FormValues = {
  title?: string;
  link?: string;
  displayLink?: string;
  iconUrl?: string;
};

export function useEditProductLinkItem({ slug, link, onSubmit }: EditProductLinkItemProps) {
  const [updateLink, { loading }] = useMutation(UPDATE_PRODUCT_LINK_MUTATION);

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
      notifications.show({ message: '모든 값이 비어있을 수는 없습니다.', color: 'red' });
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
      refetchQueries: [{ query: TempProductBySlugOnProductLinkTableDocument, variables: { slug } }],
    });

    notifications.show({ message: '수정되었습니다.', color: 'teal' });
    if (onSubmit) {
      onSubmit();
    }
  };

  return { form, submit, loading };
}
