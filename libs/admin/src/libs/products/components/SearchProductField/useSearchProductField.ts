import { gql } from "@apollo/client";
import { useThrottledCallback } from "@mantine/hooks";
import { useRef, useState } from "react";
import { useSearchProductsOnSearchProductFieldLazyQuery } from "./__generated__/useSearchProductField";

export const searchProductsOnSearchProductFieldQueryDocument = gql`
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
  const [search] = useSearchProductsOnSearchProductFieldLazyQuery();
  const [products, setProducts] = useState<{ label: string; value: string }[]>(
    [],
  );
  const latestSearchRequestId = useRef(0);

  const searchProduct = useThrottledCallback(async (query: string) => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      latestSearchRequestId.current += 1;
      setProducts([]);
      return;
    }

    const requestId = latestSearchRequestId.current + 1;
    latestSearchRequestId.current = requestId;

    const { data } = await search({
      variables: {
        query: trimmedQuery,
      },
    });

    if (requestId !== latestSearchRequestId.current) {
      return;
    }

    setProducts(
      data?.searchProducts.map(({ id, name }) => ({
        label: name,
        value: id,
      })) ?? [],
    );
  }, 500);

  return {
    products,
    searchProduct,
    selectProduct: onSelect,
  };
}
