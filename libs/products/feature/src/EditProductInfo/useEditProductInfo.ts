import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';
import { getProductInfoLengthError } from '@darun/products-domain/info';
import {
  EditProductOnEditProductInfoDocument,
  TempProductBySlugOnEditProductInfoDocument,
  TempProductBySlugOnProductInfoDocument,
} from '@darun/provider-graphql';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useLayoutEffect, useRef } from 'react';

gql`
  query TempProductBySlugOnEditProductInfo($slug: String!) {
    tempProductBySlug(slug: $slug) {
      id
      name
      summary
    }
  }

  mutation EditProductOnEditProductInfo($input: EditProductInput!, $slug: String!) {
    editProduct(input: $input, slug: $slug) {
      product {
        id
        name
        summary
      }
    }
  }
`;

type FormValues = {
  name?: string;
  summary?: string;
};

export type UseEditProductInfoProps = {
  slug: string;
  onSaved?: (productId: string) => void;
  onSubmit?: () => void;
  onCancel?: () => void;
};

export function useEditProductInfo({ slug, onSaved, onSubmit, onCancel }: UseEditProductInfoProps) {
  const {
    data,
    loading: reading,
    error: readError,
    refetch,
  } = useQuery(TempProductBySlugOnEditProductInfoDocument, {
    variables: { slug },
    // The edit form must load its own baseline, even if the details panel updates the cache.
    fetchPolicy: 'no-cache',
  });
  const product = data?.tempProductBySlug;
  const productId = product?.id;
  const originalName = product?.name ?? '';
  const originalSummary = product?.summary ?? '';
  const formSource = useRef<{ slug: string; productId: string }>(null);

  const form = useForm<FormValues>({
    mode: 'uncontrolled',
    initialValues: {
      name: '',
      summary: '',
    },
    validate: {
      name: value => (!value?.trim() ? '서비스 이름을 입력해주세요.' : getProductInfoLengthError('name', value.trim())),
      summary: value => getProductInfoLengthError('summary', value?.trim()),
    },
  });

  useLayoutEffect(() => {
    if (!productId) return;
    const values = { name: originalName, summary: originalSummary };
    form.setInitialValues(values);
    form.setValues(values);
    formSource.current = { slug, productId };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, productId, originalName, originalSummary]);

  const readState = (() => {
    if (reading) return 'loading';
    if (readError) return 'error';
    return productId ? 'ready' : 'missing';
  })();

  const [editInformation, { loading }] = useMutation(EditProductOnEditProductInfoDocument, {
    awaitRefetchQueries: true,
    refetchQueries: ({ data }) => {
      const productId = data?.editProduct?.product?.id;
      if (productId) onSaved?.(productId);
      return [TempProductBySlugOnEditProductInfoDocument, TempProductBySlugOnProductInfoDocument];
    },
    onCompleted: ({ editProduct }) => {
      if (editProduct?.product?.id) {
        notifications.show({ message: '수정되었습니다!', color: 'teal' });
        form.setInitialValues({
          name: editProduct.product.name ?? '',
          summary: editProduct.product.summary ?? '',
        });
        form.reset();
        onSubmit?.();
      }
    },
    onError: error => {
      notifications.show({ message: error.message, color: 'red' });
    },
  });

  const canEdit = readState === 'ready' && !loading;

  const submit = async (values: FormValues) => {
    if (!canEdit || formSource.current?.slug !== slug || formSource.current.productId !== productId) {
      return;
    }
    const name = values.name?.trim();
    const summary = values.summary?.trim();
    const nameError = getProductInfoLengthError('name', name);
    const summaryError = getProductInfoLengthError('summary', summary);
    if (nameError || summaryError) {
      form.setErrors({ name: nameError, summary: summaryError });
      return;
    }
    if (!name) {
      notifications.show({ message: '서비스 이름을 입력해주세요.', color: 'red' });
      return;
    }
    try {
      await editInformation({
        variables: {
          slug,
          input: {
            name,
            summary: summary ?? '',
          },
        },
      });
    } catch {
      // Handled by onError
    }
  };

  const retryRead = async () => {
    await refetch().catch(() => undefined);
  };

  return { form, submit, onCancel, loading, readState, canEdit, retryRead };
}
