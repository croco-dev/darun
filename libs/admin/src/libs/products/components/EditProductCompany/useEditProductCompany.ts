import { gql, useApolloClient } from '@apollo/client';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';
import { TempProductBySlugOnProductCompanyInfoDocument } from '../ProductCompanyInfo/__generated__/useProductCompanyInfo';
import { useRegisterProductCompanyOnEditProductCompanyMutation } from './__generated__/useEditProductCompany';

gql`
  mutation RegisterProductCompanyOnEditProductCompany($input: RegisterProductCompanyInput!, $slug: String!) {
    registerProductCompany(input: $input, slug: $slug) {
      product {
        id
      }
    }
  }
`;

type FormValues = {
  id?: string;
};

export function useEditProductCompany({ slug }: { slug: string }) {
  const apolloClient = useApolloClient();
  const { push } = useRouter();
  const [registerProductCompany] = useRegisterProductCompanyOnEditProductCompanyMutation({
    onCompleted: ({ registerProductCompany }) => {
      if (registerProductCompany.product?.id) {
        apolloClient.refetchQueries({
          include: [TempProductBySlugOnProductCompanyInfoDocument],
          onQueryUpdated: () => {
            notifications.show({ message: '저장되었습니다.', color: 'green' });
            push(`/products/${slug}`);
          },
        });
      }
    },
    onError: () => {
      notifications.show({ message: '서버 오류', color: 'red' });
    },
  });

  const form = useForm<FormValues>({
    mode: 'uncontrolled',
    initialValues: {
      id: '',
    },
  });

  const handleSubmit = (values: FormValues) => {
    if (!values.id) {
      notifications.show({ message: '값을 입력해주세요!!', color: 'red' });
      return;
    }
    registerProductCompany({ variables: { input: { companyId: values.id }, slug } });
  };

  return { form, handleSubmit };
}
