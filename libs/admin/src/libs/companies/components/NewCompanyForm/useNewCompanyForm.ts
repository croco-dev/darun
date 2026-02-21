import { gql } from "@apollo/client";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
import { useCreateCompanyOnNewCompanyFormMutation } from "./__generated__/useNewCompanyForm";

export const createCompanyOnNewCompanyFormMutationDocument = gql`
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
      name: "",
      type: "",
      address: "",
      startAt: null,
      startAtIsDisabled: false,
    },
    mode: "uncontrolled",
  });
  const { push } = useRouter();

  const [mutate] = useCreateCompanyOnNewCompanyFormMutation({
    onCompleted: ({ createCompany }) => {
      if (createCompany.company.id) {
        notifications.show({ message: "생성되었습니다.", color: "teal" });
        form.reset();
        push(`/companies`);
      }
    },
    onError: (error) => {
      notifications.show({
        title: "오류 발생",
        message: error.message,
        color: "red",
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
          startAt: values.startAtIsDisabled
            ? undefined
            : values.startAt ?? undefined,
        },
      },
    });
  };

  return { handleSubmit, form };
}
