import { gql } from '@apollo/client';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useEffect } from 'react';
import {
  useEditProductOnEditProductInfoMutation,
  useTempProductBySlugOnEditProductInfoQuery,
} from './__generated__/useEditProductInfo';

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
  const { data } = useTempProductBySlugOnEditProductInfoQuery({
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

  const [editInformation] = useEditProductOnEditProductInfoMutation({
    onCompleted: ({ editProduct }) => {
      if (editProduct.product.id) {
        notifications.show({ message: '수정되었습니다!', color: 'teal' });
        form.reset();
      }
    },
  });

  const submit = async (values: FormValues) => {
    if (!values.name && !values.summary) {
      notifications.show({ message: '값을 입력해주세요!!', color: 'red' });
      return;
    }
    try {
      await editInformation({
        variables: {
          slug,
          input: {
            name: values.name || undefined,
            summary: values.summary || undefined,
          },
        },
      });
    } catch (error) {
      console.error('mutation failed:', error);
      throw error;
    }
    onSubmit?.();
  };

  return { form, submit };
}
