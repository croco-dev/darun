import { gql } from '@apollo/client';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useCreateCompanyOnNewCompanyFormMutation } from './__generated__/useNewCompanyForm';

gql`
  mutation CreateCompanyOnNewCompanyForm($input: CreateCompanyInput!) {
    createCompany(input: $input) {
      company {
        id
      }
    }
  }
`;

type FormValues = {
  name?: string;
  type?: string;
  address?: string;
  startAt?: Date;
};

export function useNewCompanyForm() {
  const form = useForm<FormValues>({
    initialValues: {
      name: '',
      type: '',
      address: '',
      startAt: new Date(),
    },
    mode: 'uncontrolled',
  });
  const { push } = useRouter();

  const [mutate, { data, loading, error }] = useCreateCompanyOnNewCompanyFormMutation({
    onCompleted: ({ createCompany }) => {
      if (createCompany.company.id) {
        notifications.show({ message: '생성되었습니다.', color: 'teal' });
        form.reset();
        push(`/companies`);
      }
    },
  });

  const handleSubmit = (values: FormValues) => {
    if (!values.name || !values.type || !values.address || !values.startAt) return;

    mutate({
      variables: {
        input: {
          name: values.name,
          type: values.type,
          address: values.address,
          startAt: values.startAt,
        },
      },
    });
  };

  useEffect(() => {
    if (error) {
      notifications.show({
        title: '오류 발생',
        message: error.message,
        color: 'red',
      });
    }
  }, [error]);

  return { handleSubmit, form };
}
