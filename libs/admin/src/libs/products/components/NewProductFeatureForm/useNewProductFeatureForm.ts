import { gql } from '@apollo/client';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { ReactNode } from 'react';
import { useCreateProductFeatureOnNewProductFeatureFormMutation } from './__generated__/useNewProductFeatureForm';

gql`
  mutation CreateProductFeatureOnNewProductFeatureForm($input: CreateProductFeatureInput!) {
    createProductFeature(input: $input) {
      feature {
        id
        name
      }
    }
  }
`;

type FormValues = {
  name?: string;
  emoji?: string;
  summary?: string;
};
type NewProductFormProps = {
  productSlug: string;
  children: (props: {
    form: ReturnType<typeof useForm<FormValues>>;
    pickEmoji: (emoji: { native: string }) => void;
  }) => ReactNode;
};

export function useNewProductFeatureForm({ productSlug, children }: NewProductFormProps) {
  const form = useForm<FormValues>({
    mode: 'uncontrolled',
    initialValues: {
      name: '',
      emoji: '',
      summary: '',
    },
  });
  const [createProductFeature] = useCreateProductFeatureOnNewProductFeatureFormMutation({
    onCompleted: ({ createProductFeature }) => {
      if (createProductFeature.feature.id) {
        notifications.show({ message: '생성되었습니다.', color: 'teal' });
        form.reset();
      }
    },
  });

  const pickEmoji = (emoji: { native: string }) => {
    form.setFieldValue('emoji', emoji.native);
  };

  const submit = async (values: FormValues) => {
    if (!values.name || !values.emoji || !values.summary) return;

    await createProductFeature({
      variables: {
        input: {
          productSlug,
          name: values.name,
          emoji: values.emoji,
          summary: values.summary,
        },
      },
    });
  };

  return { form, children, submit, pickEmoji };
}
