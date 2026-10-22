import { createDomainError, type DomainError } from '@darun/utils-error';
import { GraphQLError, type GraphQLFormattedError } from 'graphql';
import { AuthenticationError, AuthorizationError } from 'type-graphql';

// The shared factory's base Problem prototype also recognizes domain-specific
// Problem subclasses; arbitrary infrastructure errors with a `code` do not.
const domainErrorPrototype = Object.getPrototypeOf(Object.getPrototypeOf(createDomainError('internal/type-check')));
const safeGraphQLCodes: Record<string, true> = {
  GRAPHQL_PARSE_FAILED: true,
  GRAPHQL_VALIDATION_FAILED: true,
  BAD_USER_INPUT: true,
  UNAUTHENTICATED: true,
  FORBIDDEN: true,
};

export function formatServerError(
  formatted: GraphQLFormattedError,
  error: unknown,
  development: boolean
): GraphQLFormattedError {
  console.error('[GraphQL Error]', error);
  let original = error;
  for (let depth = 0; depth < 5 && original instanceof GraphQLError && original.originalError; depth += 1) {
    original = original.originalError;
  }
  const domain =
    original instanceof Error && domainErrorPrototype.isPrototypeOf(original) ? (original as DomainError) : undefined;
  const authCode =
    original instanceof AuthenticationError
      ? 'UNAUTHENTICATED'
      : original instanceof AuthorizationError
        ? 'FORBIDDEN'
        : undefined;
  if (domain || authCode || safeGraphQLCodes[String(formatted.extensions?.code)] === true) {
    return {
      message: domain?.message ?? formatted.message,
      locations: formatted.locations,
      path: formatted.path,
      extensions: { code: domain?.code ?? authCode ?? formatted.extensions?.code },
    };
  }
  if (development) return formatted;
  return {
    message: 'Internal server error',
    locations: formatted.locations,
    path: formatted.path,
    extensions: { code: 'INTERNAL_SERVER_ERROR' },
  };
}
