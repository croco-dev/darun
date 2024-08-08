import { gql, useApolloClient } from '@apollo/client';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  useEditProductOnEditProductInfoMutation,
  useTempProductBySlugOnEditProductInfoSuspenseQuery,
} from './__generated__/useEditProductInfo';

gql`
  query TempProductBySlugOnEditProductInfo($slug: String!) {
    tempProductBySlug(slug: $slug) {
      id
      name
      summary
      logoUrl
    }
  }

  mutation EditProductOnEditProductInfo($input: EditProductInput!, $slug: String!) {
    editProduct(input: $input, slug: $slug) {
      product {
        id
      }
    }
  }
`;

type FormValues = {
  name?: string;
  summary?: string;
};

export function useEditProductInfo({ slug }: { slug: string }) {
  const { refresh } = useRouter();
  const { cache } = useApolloClient();

  const { data } = useTempProductBySlugOnEditProductInfoSuspenseQuery({ variables: { slug } });

  const form = useForm<FormValues>({
    initialValues: {
      name: '',
      summary: '',
    },
  });

  const [editInformation] = useEditProductOnEditProductInfoMutation({
    variables: {
      slug,
      input: {},
    },
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
    if (!values.name && !values.summary) {
      notifications.show({ message: '값을 입력해주세요!!', color: 'red' });
      return;
    }
    await editInformation({
      variables: {
        slug,
        input: {
          name: values.name || undefined,
          summary: values.summary || undefined,
        },
      },
    });
  };

  useEffect(() => {
    if (data) {
      form.setValues({
        name: data.tempProductBySlug?.name,
        summary: data.tempProductBySlug?.summary,
      });
    }
  }, [data]);

  return { form, submit };
}
