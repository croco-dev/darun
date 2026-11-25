import { ApolloLink, gql, Observable, type DocumentNode } from '@apollo/client';
import { CombinedGraphQLErrors, ServerError } from '@apollo/client/errors';
import { ErrorLink } from '@apollo/client/link/error';
import {
  GetLegacyProductDescriptionJobsOnAdminDocument,
  GetLegacyTranslationJobsOnAdminDocument,
} from '@darun/provider-graphql';

gql`
  query GetLegacyTranslationJobsOnAdmin($status: String, $limit: Int, $offset: Int) {
    translationJobs(status: $status, limit: $limit, offset: $offset) {
      __typename
      ...TranslationJobRowOnAdmin
    }
  }
`;

gql`
  query GetLegacyProductDescriptionJobsOnAdmin($status: String, $limit: Int, $offset: Int) {
    productDescriptionJobs(status: $status, limit: $limit, offset: $offset) {
      __typename
      ...ProductDescriptionJobRowOnAdmin
    }
  }
`;

type JobList = { pageField: string; listField: string; legacyDocument: DocumentNode; legacyOperationName: string };

const jobLists = new Map<string, JobList>([
  [
    'GetTranslationJobsOnAdmin',
    {
      pageField: 'translationJobPage',
      listField: 'translationJobs',
      legacyDocument: GetLegacyTranslationJobsOnAdminDocument,
      legacyOperationName: 'GetLegacyTranslationJobsOnAdmin',
    },
  ],
  [
    'GetProductDescriptionJobsOnAdmin',
    {
      pageField: 'productDescriptionJobPage',
      listField: 'productDescriptionJobs',
      legacyDocument: GetLegacyProductDescriptionJobsOnAdminDocument,
      legacyOperationName: 'GetLegacyProductDescriptionJobsOnAdmin',
    },
  ],
]);
const LEGACY_OFFSET_PREFIX = 'legacy-job-offset:';

function missingPageField(error: unknown, field: string) {
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
    typeof errors[0]?.message === 'string' &&
    errors[0].message.startsWith(`Cannot query field "${field}" on type "Query".`)
  );
}

function readLegacyPage(
  operation: ApolloLink.Operation,
  forward: ApolloLink.ForwardFunction,
  list: JobList,
  offset: number
) {
  const { first: limit, status } = operation.variables;
  const legacyOperation = {
    ...operation,
    client: operation.client,
    getContext: operation.getContext,
    setContext: operation.setContext,
    query: list.legacyDocument,
    operationName: list.legacyOperationName,
    variables: { status, limit, offset },
  };
  return new Observable<ApolloLink.Result>(observer => {
    const subscription = forward(legacyOperation).subscribe({
      next: result => {
        const jobs = result.data?.[list.listField];
        if (!Array.isArray(jobs)) {
          observer.next(result);
          return;
        }
        observer.next({
          ...result,
          data: {
            [list.pageField]: {
              jobs,
              nextCursor: jobs.length === limit ? `${LEGACY_OFFSET_PREFIX}${offset + limit}` : null,
            },
          },
        });
      },
      error: error => observer.error(error),
      complete: () => observer.complete(),
    });
    return () => subscription.unsubscribe();
  });
}

const continueLegacyPage = new ApolloLink((operation, forward) => {
  const list = operation.operationName && jobLists.get(operation.operationName);
  const after = operation.variables.after;
  if (list && typeof after === 'string' && after.startsWith(LEGACY_OFFSET_PREFIX)) {
    const offset = Number(after.slice(LEGACY_OFFSET_PREFIX.length));
    if (Number.isSafeInteger(offset) && offset > 0) return readLegacyPage(operation, forward, list, offset);
  }
  return forward(operation);
});

const startLegacyPage = new ErrorLink(({ error, operation, forward }) => {
  const list = operation.operationName && jobLists.get(operation.operationName);
  if (list && operation.variables.after == null && missingPageField(error, list.pageField)) {
    return readLegacyPage(operation, forward, list, 0);
  }
});

// A first-page refresh probes for the new schema again. Only lists that
// started on the older schema use offset for their remaining pages.
export const llmJobHistoryCompatibility = ApolloLink.from([continueLegacyPage, startLegacyPage]);
