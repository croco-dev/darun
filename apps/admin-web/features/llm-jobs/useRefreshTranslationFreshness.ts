import type { ObservableQuery, OperationVariables } from '@apollo/client';
import { useApolloClient } from '@apollo/client/react';
import {
  ProductOnAdminTranslationRecoveryDocument,
  TranslationFreshnessOnAdminRecoveryDocument,
} from '@darun/provider-graphql';

export function refreshFreshnessQuery<TData, TVariables extends OperationVariables>(
  query: ObservableQuery<TData, TVariables>
) {
  // Reobserve replaces the active read. Refetch can keep an older read alive.
  return query.reobserve().catch(() => {
    // The query exposes the error in the panel.
  });
}

export function useRefreshTranslationFreshness() {
  const client = useApolloClient();

  return (saved: { productId: string } | { productSlug: string; featureId: string }) => {
    const featureId = 'featureId' in saved ? saved.featureId : undefined;
    const productId =
      'productId' in saved
        ? saved.productId
        : client.readQuery({ query: ProductOnAdminTranslationRecoveryDocument, variables: { slug: saved.productSlug } })
            ?.tempProductBySlug?.id;

    void client.refetchQueries({
      include: [TranslationFreshnessOnAdminRecoveryDocument],
      onQueryUpdated: query => {
        const { entityType, entityId, fields } = query.variables;
        const affected =
          (entityType === 'ProductFeature' && entityId === featureId) ||
          (entityType === 'Product' && entityId === productId && (!featureId || fields.includes('features')));
        return affected && query.options.fetchPolicy !== 'standby' ? refreshFreshnessQuery(query) : false;
      },
    });
  };
}
