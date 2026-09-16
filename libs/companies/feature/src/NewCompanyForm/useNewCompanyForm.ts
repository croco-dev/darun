import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import {
  AllCompaniesOnAllCompanyListTableDocument,
  CreateCompanyOnNewCompanyFormDocument,
} from '@darun/provider-graphql';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

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
  startAt?: string | Date | null;
  startAtIsDisabled: boolean;
};

export function parseStartAtToIso(startAt?: string | Date | null): string | undefined {
  if (!startAt) return undefined;
  if (startAt instanceof Date) {
    return Number.isNaN(startAt.getTime()) ? undefined : startAt.toISOString();
  }
  if (typeof startAt === 'string') {
    const trimmed = startAt.trim();
    if (!trimmed) return undefined;
    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }
  return undefined;
}

export function useNewCompanyForm() {
  const [startAtIsDisabled, setStartAtIsDisabled] = useState(false);
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
      name: value => (!value?.trim() ? '회사 이름을 입력해주세요.' : null),
      type: value => (!value?.trim() ? '유형을 입력해주세요.' : null),
      address: value => (!value?.trim() ? '주소를 입력해주세요.' : null),
    },
  });
  const { push } = useRouter();

  const [mutate, { loading }] = useMutation(CreateCompanyOnNewCompanyFormDocument, {
    refetchQueries: [AllCompaniesOnAllCompanyListTableDocument],
    awaitRefetchQueries: true,
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

  const handleToggleStartAtDisabled = (checked: boolean) => {
    setStartAtIsDisabled(checked);
    form.setFieldValue('startAtIsDisabled', checked);
  };

  const handleSubmit = (values: FormValues) => {
    const name = values.name?.trim();
    const type = values.type?.trim();
    const address = values.address?.trim();
    if (loading || !name || !type || !address) return;

    const startAt = startAtIsDisabled || values.startAtIsDisabled ? undefined : parseStartAtToIso(values.startAt);

    mutate({
      variables: {
        input: {
          name,
          type,
          address,
          startAt,
        },
      },
    });
  };

  return { handleSubmit, form, startAtIsDisabled, handleToggleStartAtDisabled, loading };
}
