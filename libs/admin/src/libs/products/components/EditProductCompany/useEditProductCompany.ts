import { gql } from "@apollo/client";
import { useForm } from "@mantine/form";
import { useThrottledCallback } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { TempProductBySlugOnProductCompanyInfoDocument } from "../ProductCompanyInfo/__generated__/useProductCompanyInfo";
import {
  useRegisterProductCompanyOnEditProductCompanyMutation,
  useSearchCompaniesOnEditProductCompanyLazyQuery,
} from "./__generated__/useEditProductCompany";

export const registerProductCompanyOnEditProductCompanyMutationDocument = gql`
  mutation RegisterProductCompanyOnEditProductCompany(
    $input: RegisterProductCompanyInput!
    $slug: String!
  ) {
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
  const [registerProductCompany] =
    useRegisterProductCompanyOnEditProductCompanyMutation({
      onCompleted: ({ registerProductCompany }) => {
        if (registerProductCompany.product?.id) {
          notifications.show({ message: "저장되었습니다.", color: "green" });
          push(`/products/${slug}`);
        }
      },
      onError: () => {
        notifications.show({ message: "서버 오류", color: "red" });
      },
      refetchQueries: [TempProductBySlugOnProductCompanyInfoDocument],
    });

  const [search] = useSearchCompaniesOnEditProductCompanyLazyQuery();
  const [companies, setCompanies] = useState<
    { label: string; value: string }[]
  >([]);
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

    const { data } = await search({ variables: { query: trimmedQuery } });

    if (requestId !== latestSearchRequestId.current) {
      return;
    }

    setCompanies(
      data?.searchCompanies.map(({ id, name }) => ({
        label: name,
        value: id,
      })) ?? [],
    );
  }, 500);

  const [searchValue, setSearchValue] = useState("");
  const [, startTransition] = useTransition();

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    startTransition(() => {
      searchCompany(value);
    });
  };

  const form = useForm<FormValues>({
    mode: "uncontrolled",
    initialValues: {
      companyId: "",
    },
  });

  const handleSubmit = (values: FormValues) => {
    if (!values.companyId) {
      notifications.show({ message: "값을 입력해주세요!!", color: "red" });
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
