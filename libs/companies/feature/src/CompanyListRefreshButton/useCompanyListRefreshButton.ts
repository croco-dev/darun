import { useApolloClient } from '@apollo/client/react';
import { AllCompaniesOnAllCompanyListTableDocument } from '@darun/provider-graphql';
import { notifications } from '@mantine/notifications';
import { useCallback } from 'react';

export function useCompanyListRefreshButton() {
  const apolloClient = useApolloClient();

  const refresh = useCallback(async () => {
    await apolloClient.refetchQueries({
      include: [AllCompaniesOnAllCompanyListTableDocument],
      onQueryUpdated: () => {
        notifications.show({ message: '기업 목록을 새로 불러왔어요.', color: 'teal' });
      },
    });
  }, [apolloClient]);

  return { refresh };
}
