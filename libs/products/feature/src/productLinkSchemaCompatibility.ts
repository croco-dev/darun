import { type DocumentNode, Observable } from '@apollo/client';
import { CombinedGraphQLErrors, ServerError } from '@apollo/client/errors';
import { ErrorLink } from '@apollo/client/link/error';

const linkProductRoots = new Map([
  ['ProductOnProductLinks', 'productBySlug'],
  ['TempProductBySlugOnProductLinkTable', 'tempProductBySlug'],
  ['AddProductLinkOnNewProductLinkForm', 'addProductLink'],
  ['UpdateProductLinkOnEditProductLinkItem', 'updateProductLink'],
]);

type SelectionSet = Extract<DocumentNode['definitions'][number], { kind: 'OperationDefinition' }>['selectionSet'];

function withoutRole(selectionSet: SelectionSet): SelectionSet {
  return {
    ...selectionSet,
    selections: selectionSet.selections
      .filter(selection => selection.kind !== 'Field' || selection.name.value !== 'role')
      .map(selection =>
        'selectionSet' in selection && selection.selectionSet
          ? { ...selection, selectionSet: withoutRole(selection.selectionSet) }
          : selection
      ),
  };
}

function isMissingLinkRole(error: unknown): boolean {
  let errors: unknown;
  if (CombinedGraphQLErrors.is(error)) {
    errors = error.errors;
  } else if (ServerError.is(error) && error.statusCode === 400) {
    try {
      errors = JSON.parse(error.bodyText).errors;
    } catch {
      return false;
    }
  }

  return (
    Array.isArray(errors) &&
    errors.length === 1 &&
    errors[0]?.extensions?.code === 'GRAPHQL_VALIDATION_FAILED' &&
    errors[0]?.message === 'Cannot query field "role" on type "Link".'
  );
}

// The webs can deploy before the API. Retry only a document rejected before execution,
// and only when no new write intent would be lost.
export const productLinkSchemaCompatibility = new ErrorLink(({ error, operation, forward }) => {
  const root = operation.operationName && linkProductRoots.get(operation.operationName);
  if (!root) return;
  const isMutation = operation.operationType === 'mutation';
  const input = operation.variables.input;
  if (isMutation && (input?.role !== undefined || input?.makePrimary !== undefined || input?.title === '')) return;
  if (!isMissingLinkRole(error)) return;

  const retry = {
    ...operation,
    client: operation.client,
    getContext: operation.getContext,
    setContext: operation.setContext,
    query: {
      ...operation.query,
      definitions: operation.query.definitions.map(definition =>
        definition.kind === 'OperationDefinition' || definition.kind === 'FragmentDefinition'
          ? { ...definition, selectionSet: withoutRole(definition.selectionSet) }
          : definition
      ),
    },
  };

  return new Observable(observer => {
    const subscription = forward(retry).subscribe({
      next: result => {
        const data = result.data;
        const product = isMutation ? data?.[root]?.product : data?.[root];
        const links: unknown = product?.links;
        if (!Array.isArray(links)) {
          observer.next(result);
          return;
        }
        const updated = { ...product, links: links.map(link => ({ ...link, role: null })) };
        observer.next({
          ...result,
          data: { ...data, [root]: isMutation ? { ...data?.[root], product: updated } : updated },
        });
      },
      error: failure => observer.error(failure),
      complete: () => observer.complete(),
    });
    return () => subscription.unsubscribe();
  });
});
