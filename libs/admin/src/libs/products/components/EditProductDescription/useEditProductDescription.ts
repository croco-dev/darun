import { gql, useApolloClient } from '@apollo/client';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  useEditProductOnEditProductDescriptionMutation,
  useTempProductBySlugOnEditProductDescriptionSuspenseQuery,
} from './__generated__/useEditProductDescription';

gql`
  query TempProductBySlugOnEditProductDescription($slug: String!) {
    tempProductBySlug(slug: $slug) {
      id
      description
    }
  }

  mutation EditProductOnEditProductDescription($input: EditProductInput!, $slug: String!) {
    editProduct(input: $input, slug: $slug) {
      product {
        id
      }
    }
  }
`;

type FormValues = {
  description?: string;
};

export function useEditProductDescription({ slug }: { slug: string }) {
  const { refresh } = useRouter();
  const { cache } = useApolloClient();

  const { data } = useTempProductBySlugOnEditProductDescriptionSuspenseQuery({ variables: { slug } });

  const form = useForm<FormValues>({
    initialValues: {
      description: '',
    },
  });

  const [editDescription] = useEditProductOnEditProductDescriptionMutation({
    onCompleted: ({ editProduct }) => {
      if (editProduct.product.id) {
        notifications.show({ message: '수정되었습니다!', color: 'teal' });
        form.reset();
        refresh();
        cache.reset();
      }
    },
  });

  const submit = async (values: FormValues) => {
    if (!values.description) {
      notifications.show({ message: '값을 입력해주세요!!', color: 'red' });
      return;
    }

    await editDescription({
      variables: {
        slug,
        input: {
          description: values.description || '',
        },
      },
    });
  };

  useEffect(() => {
    if (data) {
      form.setValues({ description: data.tempProductBySlug?.description || undefined });
    }
  }, [data, form]);

  return { form, submit };
}
