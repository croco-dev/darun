'use client';

import { gql } from '@apollo/client';
import { useMutation, useLazyQuery } from '@apollo/client/react';
import {
  RegisterProductCompanyOnEditProductCompanyDocument,
  SearchCompaniesOnEditProductCompanyDocument,
  TempProductBySlugOnProductCompanyInfoDocument,
} from '@darun/provider-graphql';
import { useForm } from '@mantine/form';
import { useThrottledCallback } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';

export const registerProductCompanyOnEditProductCompanyMutationDocument = gql`
  mutation RegisterProductCompanyOnEditProductCompany($input: RegisterProductCompanyInput!, $slug: String!) {
    registerProductCompany(input: $input, slug: $slug) {
      product {
        id
      }
    }
  }
`;

export const searchCompaniesOnEditProductCompanyQueryDocument = gql`
  query SearchCompaniesOnEditProductCompany($query: String!) {
    searchCompanies(query: $query) {
      id
      name
    }
  }
`;

type FormValues = {
  companyId: string;
};

export function useEditProductCompany({ slug }: { slug: string }) {
  const { push } = useRouter();
  const [registerProductCompany] = useMutation(RegisterProductCompanyOnEditProductCompanyDocument, {
    onCompleted: ({ registerProductCompany }) => {
      if (registerProductCompany.product?.id) {
        notifications.show({ message: '저장되었습니다.', color: 'green' });
        push(`/products/${slug}`);
      }
    },
    onError: error => {
      notifications.show({
        title: '오류 발생',
        message: error.message,
        color: 'red',
      });
    },
    refetchQueries: [TempProductBySlugOnProductCompanyInfoDocument],
  });

  const [search] = useLazyQuery(SearchCompaniesOnEditProductCompanyDocument);
  const [companies, setCompanies] = useState<{ label: string; value: string }[]>([]);
  const latestSearchRequestId = useRef(0);

  const searchCompany = useThrottledCallback(async (query: string) => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      latestSearchRequestId.current += 1;
      setCompanies([]);
      return;
    }

    const requestId = latestSearchRequestId.current + 1;
    latestSearchRequestId.current = requestId;

    let data: Awaited<ReturnType<typeof search>>['data'] | undefined;
    try {
      ({ data } = await search({ variables: { query: trimmedQuery } }));
    } catch {
      if (requestId === latestSearchRequestId.current) {
        setCompanies([]);
      }
      return;
    }

    if (requestId !== latestSearchRequestId.current) {
      return;
    }

    setCompanies(
      data?.searchCompanies.map(({ id, name }) => ({
        label: name,
        value: id,
      })) ?? []
    );
  }, 500);

  const [searchValue, setSearchValue] = useState('');
  const [, startTransition] = useTransition();

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    startTransition(() => {
      searchCompany(value);
    });
  };

  const form = useForm<FormValues>({
    mode: 'uncontrolled',
    initialValues: {
      companyId: '',
    },
  });

  const handleSubmit = (values: FormValues) => {
    if (!values.companyId) {
      notifications.show({ message: '회사를 선택해주세요.', color: 'red' });
      return;
    }
    registerProductCompany({
      variables: { input: { companyId: values.companyId }, slug },
    });
  };

  return {
    form,
    handleSubmit,
    companies,
    searchValue,
    handleSearchChange,
  };
}
