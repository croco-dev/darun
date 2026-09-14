'use client';

import { useApolloClient } from '@apollo/client/react';
import { notifications } from '@mantine/notifications';
import { useCallback, useRef, useState } from 'react';
import { AllProductsOnProductListTableDocument } from '../ProductListTable';

export function useProductListRefreshButton() {
  const apolloClient = useApolloClient();
  const [loading, setLoading] = useState(false);
  const isRefreshingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (isRefreshingRef.current || loading) return;
    isRefreshingRef.current = true;
    setLoading(true);
    try {
      await apolloClient.refetchQueries({
        include: [AllProductsOnProductListTableDocument],
        onQueryUpdated: () => {
          notifications.show({ message: '서비스 목록을 새로 불러왔어요.' });
        },
      });
    } catch {
      notifications.show({ message: '서비스 목록을 새로 불러오지 못했습니다.', color: 'red' });
    } finally {
      isRefreshingRef.current = false;
      setLoading(false);
    }
  }, [apolloClient, loading]);

  return { refresh, loading };
}
