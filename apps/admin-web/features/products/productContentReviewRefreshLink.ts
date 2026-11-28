import { ApolloLink, Observable } from '@apollo/client';

const sourceMutations = new Set([
  'addProductLink',
  'addProductScreenshot',
  'applyProductDescriptionCandidate',
  'createProductFeature',
  'createProductFlow',
  'deleteProductFlow',
  'deleteProductScreenshot',
  'editProduct',
  'publishProduct',
  'updateProductCategories',
  'updateProductFeature',
  'updateProductFlow',
  'updateProductLink',
  'updateProductScreenshot',
  'updateProductTags',
]);

export const productContentReviewRefreshLink = new ApolloLink((operation, forward) => {
  const updatesSource =
    operation.operationType === 'mutation' &&
    operation.query.definitions.some(
      definition =>
        definition.kind === 'OperationDefinition' &&
        definition.name?.value === operation.operationName &&
        definition.selectionSet.selections.some(
          selection => selection.kind === 'Field' && sourceMutations.has(selection.name.value)
        )
    );

  if (!updatesSource) return forward(operation);

  return new Observable(observer =>
    forward(operation).subscribe({
      next(result) {
        observer.next(result);
        if (!result.data || result.errors?.length) return;
        for (const query of operation.client.getObservableQueries('active')) {
          if (query.queryName === 'AdminProductContentReviewDetail') {
            void query.reobserve({ context: { ...query.options.context, queryDeduplication: false } }).catch(() => {});
          }
        }
      },
      error: error => observer.error(error),
      complete: () => observer.complete(),
    })
  );
});
