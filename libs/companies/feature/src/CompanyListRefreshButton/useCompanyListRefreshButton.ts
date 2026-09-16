'use client';

import { useApolloClient } from '@apollo/client/react';
import { AllCompaniesOnAllCompanyListTableDocument } from '@darun/provider-graphql';
import { notifications } from '@mantine/notifications';
import { useCallback, useState } from 'react';

export function useCompanyListRefreshButton() {
  const apolloClient = useApolloClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await apolloClient.refetchQueries({
        include: [AllCompaniesOnAllCompanyListTableDocument],
        onQueryUpdated: () => {
          notifications.show({ message: '기업 목록을 새로 불러왔어요.', color: 'teal' });
        },
      });
    } catch (error) {
      notifications.show({
        title: '새로고침 실패',
        message: error instanceof Error ? error.message : '기업 목록을 새로고침하는 데 실패했습니다.',
        color: 'red',
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [apolloClient, isRefreshing]);

  return { refresh, isRefreshing };
}
