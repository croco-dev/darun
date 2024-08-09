import { gql } from '@apollo/client';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  useEditProductOnEditProductDescriptionMutation,
  useTempProductBySlugOnEditProductDescriptionQuery,
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
  useTempProductBySlugOnEditProductDescriptionQuery({
    variables: { slug },
    onCompleted: ({ tempProductBySlug }) => {
      form.setValues({ description: tempProductBySlug?.description ?? '' });
    },
  });

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

  return { form, submit };
}
