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

export type UseEditProductInfoProps = {
  slug: string;
  onSubmit?: () => void;
  onCancel?: () => void;
};

export function useEditProductInfo({ slug, onSubmit, onCancel }: UseEditProductInfoProps) {
  const { data } = useQuery(TempProductBySlugOnEditProductInfoDocument, {
    variables: { slug },
  });

  const form = useForm<FormValues>({
    mode: 'uncontrolled',
    initialValues: {
      name: '',
      summary: '',
    },
    validate: {
      name: value => (!value?.trim() ? '서비스 이름을 입력해주세요.' : null),
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
    const name = values.name?.trim();
    const summary = values.summary?.trim();
    if (!name) {
      notifications.show({ message: '서비스 이름을 입력해주세요.', color: 'red' });
      return;
    }
    await editInformation({
      variables: {
        slug,
        input: {
          name,
          summary: summary || undefined,
        },
      },
    });
  };

  return { form, submit, onCancel, loading };
}
