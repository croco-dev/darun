import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  EditProductOnEditProductInfoDocument,
  TempProductBySlugOnEditProductInfoDocument,
} from '@darun/provider-graphql';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useEffect } from 'react';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
gql`
  query TempProductBySlugOnEditProductInfo($slug: String!) {
    tempProductBySlug(slug: $slug) {
      id
      name
      summary
    }
  }

  mutation EditProductOnEditProductInfo($input: EditProductInput!, $slug: String!) {
    editProduct(input: $input, slug: $slug) {
      product {
        id
        name
        summary
      }
    }
  }
`;

type FormValues = {
  name?: string;
  summary?: string;
};

export function useEditProductInfo({ slug, onSubmit }: { slug: string; onSubmit?: () => void }) {
  const { data } = useQuery(TempProductBySlugOnEditProductInfoDocument, {
    variables: { slug },
  });

  const form = useForm<FormValues>({
    mode: 'uncontrolled',
    initialValues: {
      name: '',
      summary: '',
    },
  });

  useEffect(() => {
    form.setValues({
      name: data?.tempProductBySlug?.name ?? '',
      summary: data?.tempProductBySlug?.summary ?? '',
    });
  }, [data, form]);

  const [editInformation] = useMutation(EditProductOnEditProductInfoDocument, {
    onCompleted: ({ editProduct }) => {
      if (editProduct.product.id) {
        notifications.show({ message: '수정되었습니다!', color: 'teal' });
        form.reset();
        onSubmit?.();
      }
    },
    onError: error => {
      notifications.show({ message: error.message, color: 'red' });
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

  return { form, submit };
}
