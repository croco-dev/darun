import { useApolloClient } from '@apollo/client';
import { notifications } from '@mantine/notifications';
import { useCallback } from 'react';
import { AllProductsOnProductListTableDocument } from '../ProductListTable';

export function useProductListRefreshButton() {
  const apolloClient = useApolloClient();

  const refresh = useCallback(async () => {
    await apolloClient.refetchQueries({
      include: [AllProductsOnProductListTableDocument],
      onQueryUpdated: () => {
        notifications.show({ message: '서비스 목록을 새로 불러왔어요.' });
      },
    });
  }, [apolloClient]);

  return { refresh };
}
