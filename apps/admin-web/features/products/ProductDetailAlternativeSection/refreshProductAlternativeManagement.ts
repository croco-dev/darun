import type { ApolloClient } from '@apollo/client';
import { ProductAlternativeManagementDocument } from '@darun/provider-graphql';

export function refreshProductAlternativeManagement(client: ApolloClient, slug: string) {
  return client.refetchQueries({
    include: [ProductAlternativeManagementDocument],
    onQueryUpdated: query => {
      if (query.variables['slug'] !== slug) return false;

      // Replace the watched request so an older response cannot overwrite the list after a save.
      return query.reobserve({ context: { ...query.options.context, queryDeduplication: false } });
    },
  });
}
