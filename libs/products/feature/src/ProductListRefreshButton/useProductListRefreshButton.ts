'use client';

import { useApolloClient } from '@apollo/client/react';
import { notifications } from '@mantine/notifications';
import { useCallback, useState } from 'react';
import { AllProductsOnProductListTableDocument } from '../ProductListTable';

export function useProductListRefreshButton() {
  const apolloClient = useApolloClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await apolloClient.refetchQueries({
        include: [AllProductsOnProductListTableDocument],
        onQueryUpdated: () => {
          notifications.show({ message: '서비스 목록을 새로 불러왔어요.', color: 'teal' });
        },
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [apolloClient, isRefreshing]);

  return { refresh, isRefreshing };
}
