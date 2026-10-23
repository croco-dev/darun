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

function findErrorCallSite(error: unknown): string | undefined {
  let current = error;
  for (let depth = 0; depth < 5 && current instanceof Error; depth += 1) {
    const header = `${current.name}: ${current.message}`;
    if (current.stack?.startsWith(`${header}\n`)) {
      // V8's entire message may contain newlines and fake `at` lines. Only inspect
      // the suffix after its exact header, never lines inside the message itself.
      return current.stack
        .slice(header.length)
        .split('\n')
        .find(line => /^\s+at\s/.test(line));
    }
    // GraphQL wrappers can inherit the original error's stack and a different message.
    current = 'originalError' in current ? current.originalError : undefined;
  }
  return undefined;
}

// CJS Apollo and ESM consumers can load separate GraphQL constructors.
function isGraphQLError(error: unknown): error is GraphQLError {
  return (
    error instanceof Error &&
    error.name === 'GraphQLError' &&
    'extensions' in error &&
    typeof error.extensions === 'object' &&
    error.extensions !== null &&
    'toJSON' in error &&
    typeof error.toJSON === 'function'
  );
}

export function formatServerError(
  formatted: GraphQLFormattedError,
  error: unknown,
  development: boolean
): GraphQLFormattedError {
  let original = error;
  for (let depth = 0; depth < 5 && isGraphQLError(original) && original.originalError; depth += 1) {
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
  console.error('[GraphQL Error]', {
    code: domain?.code ?? formatted.extensions?.code,
    path: formatted.path,
    callSite: findErrorCallSite(error),
    locations: formatted.locations,
  });
  const explicitCode =
    isGraphQLError(original) &&
    !original.originalError &&
    typeof original.extensions.code === 'string' &&
    original.extensions.code !== 'INTERNAL_SERVER_ERROR'
      ? original.extensions.code
      : undefined;
  if (domain || authCode || explicitCode || safeGraphQLCodes[String(formatted.extensions?.code)] === true) {
    return {
      message: domain?.message ?? formatted.message,
      locations: formatted.locations,
      path: formatted.path,
      extensions: { code: domain?.code ?? authCode ?? explicitCode ?? formatted.extensions?.code },
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
