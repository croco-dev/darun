import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { CreateCompanyOnNewCompanyFormDocument } from '@darun/provider-graphql';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
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
  startAt?: Date | null;
  startAtIsDisabled: boolean;
};

export function useNewCompanyForm() {
  const form = useForm<FormValues>({
    initialValues: {
      name: '',
      type: '',
      address: '',
      startAt: null,
      startAtIsDisabled: false,
    },
    mode: 'uncontrolled',
    validate: {
      name: value => (!value ? '회사 이름을 입력해주세요.' : null),
      type: value => (!value ? '유형을 입력해주세요.' : null),
      address: value => (!value ? '주소를 입력해주세요.' : null),
    },
  });
  const { push } = useRouter();

  const [mutate] = useMutation(CreateCompanyOnNewCompanyFormDocument, {
    onCompleted: ({ createCompany }) => {
      if (createCompany.company.id) {
        notifications.show({ message: '생성되었습니다.', color: 'teal' });
        form.reset();
        push(`/companies`);
      }
    },
    onError: error => {
      notifications.show({
        title: '오류 발생',
        message: error.message,
        color: 'red',
      });
    },
  });

  const handleSubmit = (values: FormValues) => {
    if (!values.name || !values.type || !values.address) return;

    mutate({
      variables: {
        input: {
          name: values.name,
          type: values.type,
          address: values.address,
          startAt: values.startAtIsDisabled ? undefined : (values.startAt?.toISOString() ?? undefined),
        },
      },
    });
  };

  return { handleSubmit, form };
}
