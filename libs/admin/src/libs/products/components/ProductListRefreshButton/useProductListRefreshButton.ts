import { useApolloClient } from '@apollo/client';
import { useRouter } from 'next/navigation';

export function useProductListRefreshButton() {
  const { cache } = useApolloClient();
  const { refresh: routeRefresh } = useRouter();
  const refresh = () => {
    cache.reset();
    routeRefresh();
  };
  return { refresh };
}
