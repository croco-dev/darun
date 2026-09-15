import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  EditProductOnEditProductInfoDocument,
  TempProductBySlugOnEditProductInfoDocument,
  TempProductBySlugOnProductInfoDocument,
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
    const values = {
      name: data?.tempProductBySlug?.name ?? '',
      summary: data?.tempProductBySlug?.summary ?? '',
    };
    form.setInitialValues(values);
    form.setValues(values);
  }, [data, form]);

  const [editInformation, { loading }] = useMutation(EditProductOnEditProductInfoDocument, {
    refetchQueries: [TempProductBySlugOnEditProductInfoDocument, TempProductBySlugOnProductInfoDocument],
    awaitRefetchQueries: true,
    onCompleted: ({ editProduct }) => {
      if (editProduct.product.id) {
        notifications.show({ message: '수정되었습니다!', color: 'teal' });
        form.setInitialValues({
          name: editProduct.product.name ?? '',
          summary: editProduct.product.summary ?? '',
        });
        form.reset();
        onSubmit?.();
      }
    },
    onError: error => {
      notifications.show({ message: error.message, color: 'red' });
    },
  });

  const submit = async (values: FormValues) => {
    if (loading) {
      return;
    }
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

  return { form, submit, loading };
}
