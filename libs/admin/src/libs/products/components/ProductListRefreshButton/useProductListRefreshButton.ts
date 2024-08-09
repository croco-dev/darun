import { useApolloClient } from '@apollo/client';

export function useProductListRefreshButton() {
  const apolloClient = useApolloClient();

  const refresh = async () => {
    await apolloClient.refetchQueries({ include: ['AllProductsOnProductListTable'] });
  };

  return { refresh };
}
