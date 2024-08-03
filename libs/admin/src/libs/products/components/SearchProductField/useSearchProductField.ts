import { gql } from '@apollo/client';
import { useThrottledCallback } from '@mantine/hooks';
import { useSearchProductsOnSearchProductFieldLazyQuery } from './__generated__/useSearchProductField';

gql`
  query SearchProductsOnSearchProductField($query: String!) {
    searchProducts(query: $query) {
      id
      name
    }
  }
`;
type SearchProductFieldProps = {
  onSelect: (productId: string | null) => void;
};

export function useSearchProductField({ onSelect }: SearchProductFieldProps) {
  const searchProduct = useThrottledCallback(async (query: string) => {
    if (!query) return;

    await search({
      variables: {
        query,
      },
    });
  }, 500);
  const [search, { data }] = useSearchProductsOnSearchProductFieldLazyQuery();

  return {
    products: data?.searchProducts.map(({ id, name }) => ({ label: name, value: id })) ?? [],
    searchProduct,
    selectProduct: onSelect,
  };
}
