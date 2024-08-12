import { gql, useApolloClient } from '@apollo/client';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { TempProductBySlugOnProductFeatureTableDocument } from '../ProductFeatureTable/__generated__/useProductFeatureTable';
import {
  useAdminFeatureByIdOnEditProductFeatureItemQuery,
  useUpdateProductFeatureOnEditProductFeatureItemMutation,
} from './__generated__/useEditProductFeatureItem';

gql`
  query AdminFeatureByIdOnEditProductFeatureItem($id: String!) {
    adminFeatureById(id: $id) {
      id
      emoji
      name
      summary
    }
  }

  mutation UpdateProductFeatureOnEditProductFeatureItem($input: UpdateProductFeatureInput!, $featureId: String!) {
    updateProductFeature(input: $input, id: $featureId) {
      feature {
        id
      }
    }
  }
`;

type EditProductFeatureItemProps = { featureId: string; onSubmit?: () => void };

type FormValues = {
  emoji?: string;
  name?: string;
  summary?: string;
};

export function useEditProductFeatureItem({ featureId, onSubmit }: EditProductFeatureItemProps) {
  const apolloClient = useApolloClient();

  const { loading: queryLoading } = useAdminFeatureByIdOnEditProductFeatureItemQuery({
    variables: { id: featureId },
    onCompleted: ({ adminFeatureById }) => {
      if (adminFeatureById) {
        form.setValues({
          emoji: adminFeatureById.emoji,
          name: adminFeatureById.name,
          summary: adminFeatureById.summary || undefined,
        });
      }
    },
  });
  const [updateFeature, { loading: mutationLoading }] = useUpdateProductFeatureOnEditProductFeatureItemMutation({
    onCompleted: ({ updateProductFeature }) => {
      if (updateProductFeature) {
        notifications.show({ message: '수정되었습니다.', color: 'teal' });
        apolloClient.refetchQueries({ include: [TempProductBySlugOnProductFeatureTableDocument] });
      }
    },
  });

  const form = useForm<FormValues>({
    initialValues: {
      emoji: '',
      name: '',
      summary: '',
    },
  });

  const submit = async (values: FormValues) => {
    if (!values.name && !values.summary && !values.emoji) {
      notifications.show({ message: '모든 값이 비어있을 수는 없습니다.', color: 'red' });
      return;
    }

    await updateFeature({
      variables: {
        featureId,
        input: {
          emoji: values.emoji,
          name: values.name,
          summary: values.summary,
        },
      },
    });

    if (onSubmit) {
      onSubmit();
    }
  };

  return { loading: queryLoading || mutationLoading, form, submit };
}
