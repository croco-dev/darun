import { gql } from '@apollo/client';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
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
        name
        summary
        logoUrl
      }
    }
  }
`;

type FormValues = {
  name?: string;
  summary?: string;
};

export function useEditProductInfo({ slug, onSubmit }: { slug: string; onSubmit?: () => void }) {
  const { data } = useTempProductBySlugOnEditProductInfoSuspenseQuery({ variables: { slug } });

  const form = useForm<FormValues>({
    initialValues: {
      name: '',
      summary: '',
    },
  });

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
    await editInformation({
      variables: {
        slug,
        input: {
          name: values.name || undefined,
          summary: values.summary || undefined,
        },
      },
    });
    onSubmit?.();
  };

  return { form, submit };
}
