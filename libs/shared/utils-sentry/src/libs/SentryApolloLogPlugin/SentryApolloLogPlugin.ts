import { ApolloServerPlugin } from '@apollo/server';
import * as Sentry from '@sentry/node';
import { Kind, parse, print, visit, type DocumentNode } from 'graphql';

const SECRET_ARGUMENTS: Record<string, true> = { apiKey: true, braveApiKey: true };
const REDACTED = '[REDACTED]';
const SDK_IDENTITY_FIELDS: Record<string, true> = {
  event_id: true,
  trace_id: true,
  span_id: true,
  parent_span_id: true,
  type: true,
};

function redactSettingCredentials(document: DocumentNode, variables?: Record<string, unknown>) {
  const secretVariables = new Set<string>();
  const secrets = new Set<string>();
  const propertyNames = new Set<string>();
  const collectSecret = (value: unknown) => {
    if (typeof value === 'string' && value) {
      secrets.add(value);
      secrets.add(JSON.stringify(value).slice(1, -1));
    } else if (value && typeof value === 'object') {
      // Object keys belong to rejected input echoes, not the SDK's protocol vocabulary.
      for (const [key, nestedValue] of Object.entries(value)) {
        if (!Array.isArray(value) && key) {
          propertyNames.add(key);
          propertyNames.add(JSON.stringify(key).slice(1, -1));
        }
        collectSecret(nestedValue);
      }
    }
  };
  let redactedDocument = visit(document, {
    Argument(node) {
      if (!Object.prototype.hasOwnProperty.call(SECRET_ARGUMENTS, node.name.value)) return;
      if (node.value.kind === Kind.VARIABLE) {
        secretVariables.add(node.value.name.value);
        collectSecret(variables?.[node.value.name.value]);
      } else if (node.value.kind === Kind.STRING) {
        collectSecret(node.value.value);
      }
      return { ...node, value: { kind: Kind.STRING, value: REDACTED } };
    },
  });
  redactedDocument = visit(redactedDocument, {
    VariableDefinition(node) {
      if (!secretVariables.has(node.variable.name.value) || !node.defaultValue) return;
      if (node.defaultValue.kind === Kind.STRING) collectSecret(node.defaultValue.value);
      return { ...node, defaultValue: { kind: Kind.STRING, value: REDACTED } };
    },
  });
  const redactedVariables = variables ? { ...variables } : undefined;
  for (const name of secretVariables) {
    if (redactedVariables && name in redactedVariables) redactedVariables[name] = REDACTED;
  }
  return {
    query: print(redactedDocument),
    variables: redactedVariables,
    secrets: [...secrets].sort((left, right) => right.length - left.length),
    propertyNames: [...propertyNames].sort((left, right) => right.length - left.length),
  };
}

/** Keep SDK structure/identity separate from free-form request, error and log copies. */
function redactCredentialEvent<T extends Sentry.Event>(
  event: T,
  redactText: (value: string, input?: boolean) => string
): T {
  const redacted: T = JSON.parse(
    JSON.stringify(event, (key, value: unknown) =>
      typeof value === 'string' && !Object.prototype.hasOwnProperty.call(SDK_IDENTITY_FIELDS, key)
        ? redactText(value)
        : value
    )
  );
  // These bags can contain credential-keyed objects. Their keys are input, unlike
  // event/exception/span fields, HTTP header names, or ContextLines source snippets.
  const redactInput = (value: unknown): unknown => {
    if (typeof value === 'string') return redactText(value, true);
    if (Array.isArray(value)) return value.map(redactInput);
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([key, nested]) => [redactText(key, true), redactInput(nested)])
      );
    }
    return value;
  };
  if (redacted.extra) redacted.extra = redactInput(redacted.extra) as typeof redacted.extra;
  if (typeof redacted.message === 'string') redacted.message = redactText(redacted.message, true);
  for (const exception of redacted.exception?.values ?? []) {
    if (exception.value) exception.value = redactText(exception.value, true);
  }
  for (const breadcrumb of redacted.breadcrumbs ?? []) {
    if (breadcrumb.message) breadcrumb.message = redactText(breadcrumb.message, true);
    if (breadcrumb.data) breadcrumb.data = redactInput(breadcrumb.data) as typeof breadcrumb.data;
  }
  return redacted;
}

/** Final egress policy for both error events and real HTTP transactions (including their spans). */
function redactSentryRequestCredentials<T extends Sentry.Event>(event: T): T {
  // Captured scopes are consumed by the SDK before these hooks. They are not
  // envelope fields and may contain cyclic client/span state; never traverse them.
  const sendingEvent = { ...event, sdkProcessingMetadata: { ...event.sdkProcessingMetadata } };
  delete sendingEvent.sdkProcessingMetadata.capturedSpanScope;
  delete sendingEvent.sdkProcessingMetadata.capturedSpanIsolationScope;
  const secrets = new Set<string>();
  const propertyNames = new Set<string>();
  const collectOperation = (body: unknown): void => {
    if (Array.isArray(body)) {
      for (const operation of body) collectOperation(operation);
      return;
    }
    if (!body || typeof body !== 'object' || !('query' in body) || typeof body.query !== 'string') return;
    const variables =
      'variables' in body && body.variables && typeof body.variables === 'object'
        ? (body.variables as Record<string, unknown>)
        : undefined;
    try {
      const credentials = redactSettingCredentials(parse(body.query), variables);
      for (const secret of credentials.secrets) secrets.add(secret);
      for (const name of credentials.propertyNames) propertyNames.add(name);
    } catch {
      // Invalid documents are not executable; raw request bodies and searches are still removed below.
    }
  };
  const collectSearch = (search: string) => {
    const params = new URLSearchParams(search);
    const query = params.get('query');
    if (!query) return;
    let variables: unknown;
    try {
      variables = JSON.parse(params.get('variables') ?? 'null');
    } catch {
      // Apollo rejects malformed variables; the original search is never sent.
    }
    collectOperation({ query, variables });
  };
  const collect = (value: unknown): void => {
    if (typeof value === 'string') {
      if (/^\s*[\[{]/.test(value)) {
        try {
          collectOperation(JSON.parse(value));
        } catch {
          // Not a JSON request body.
        }
      }
      const searchStart = value.indexOf('?');
      if (searchStart >= 0) collectSearch(value.slice(searchStart + 1).split('#')[0]);
      else if (/(?:^|&)query=/.test(value)) collectSearch(value);
    } else if (value && typeof value === 'object') {
      collectOperation(value);
      for (const nested of Object.values(value)) collect(nested);
    }
  };
  // RequestData and the SDK metadata may each hold a copy; spans can also carry a GET URL.
  collect(sendingEvent);
  const encodedSecrets = new Map<string, boolean>();
  for (const secret of [...propertyNames, ...secrets]) {
    const inputOnly = !secrets.has(secret);
    encodedSecrets.set(secret, inputOnly);
    encodedSecrets.set(new URLSearchParams({ value: secret }).toString().slice('value='.length), inputOnly);
    try {
      encodedSecrets.set(encodeURI(secret), inputOnly);
      encodedSecrets.set(encodeURIComponent(secret), inputOnly);
    } catch {
      // Lone UTF-16 surrogates have no URI encoding; their original/JSON forms are still redacted.
    }
  }
  const patterns = [...encodedSecrets]
    .sort(([a], [b]) => b.length - a.length)
    .map(([secret, inputOnly]) => {
      const escaped = secret.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Percent hex digits are case-insensitive, but credential characters are not.
      return {
        inputOnly,
        pattern: new RegExp(
          escaped.replace(/%[\dA-Fa-f]{2}/g, octet =>
            octet
              .split('')
              .map(char => (/[A-Fa-f]/.test(char) ? `[${char.toLowerCase()}${char.toUpperCase()}]` : char))
              .join('')
          ),
          'g'
        ),
      };
    });
  const redactText = (value: string, input = false) => {
    // Remove the search from copied HTTP URLs/targets too, not just event.request.
    // This also covers legal percent encodings of otherwise unreserved characters.
    const searchStart = value.indexOf('?');
    if (searchStart >= 0 && new URLSearchParams(value.slice(searchStart + 1)).has('query')) {
      value = value.slice(0, searchStart);
    } else if (/(?:^|&)query=/.test(value)) {
      value = REDACTED;
    }
    for (const { pattern, inputOnly } of patterns) {
      if (input || !inputOnly) value = value.replace(pattern, REDACTED);
    }
    return value;
  };
  const redacted = redactCredentialEvent(sendingEvent, redactText);
  for (const request of [redacted.request, redacted.sdkProcessingMetadata?.normalizedRequest]) {
    if (!request) continue;
    delete request.data;
    delete request.query_string;
    if (request.url) request.url = request.url.split(/[?#]/)[0];
  }
  return redacted;
}

export const sentryRequestRedaction = {
  beforeSend: redactSentryRequestCredentials,
  beforeSendTransaction: redactSentryRequestCredentials,
};

export const createSentryApolloLogPlugin = (): ApolloServerPlugin => ({
  requestDidStart: async () => ({
    didEncounterErrors: async ctx => {
      if (!ctx.operation || !ctx.document) {
        return;
      }

      // Use Apollo's parsed document, not variable names or field aliases supplied by clients.
      const redacted = redactSettingCredentials(ctx.document, ctx.request.variables);
      const texts = [...redacted.secrets, ...redacted.propertyNames].sort((left, right) => right.length - left.length);
      const redactText = (value: string, input = false) => {
        for (const secret of texts) {
          if (input || redacted.secrets.includes(secret)) value = value.split(secret).join(REDACTED);
        }
        return value;
      };

      for (const err of ctx.errors) {
        // Add scoped report details and send to Sentry
        Sentry.withScope(scope => {
          // Annotate whether failing operation was query/mutation/subscription
          scope.setTag('kind', ctx.operation?.operation);

          scope.setExtra('query', redacted.query);
          scope.setExtra('variables', redacted.variables);

          // Protect operation diagnostics here; leave request copies intact until the
          // common egress policy has identified credentials from the entire batch.
          scope.addEventProcessor(event => {
            const { request, sdkProcessingMetadata, ...diagnostics } = event;
            const redactedEvent = redactCredentialEvent(diagnostics, redactText);
            return { ...redactedEvent, request, sdkProcessingMetadata };
          });

          if ('path' in err) {
            // We can also add the path as breadcrumb
            scope.addBreadcrumb({
              category: 'query-path',
              message: err.path?.join(' > '),
              level: 'debug',
            });
          }

          const transactionId = ctx.request.http?.headers.get('x-transaction-id');
          if (transactionId) {
            scope.setTransactionName(transactionId);
          }

          // Redact before the SDK parses the stack: a multiline property name can
          // otherwise become a frame whose function/filename is only part of the secret.
          // Leave Apollo's original error and its public response untouched.
          if (texts.length > 0) {
            // Materialize V8's lazy stack before copying descriptors. A copied stack
            // accessor cannot read the original Error's private stack storage on Node 22.
            let stack = err.stack;
            if (stack) {
              // Wrapped coercion errors can have a different message from their
              // original stack header. Remove complete multiline keys even there,
              // before their embedded `at ...` lines can be parsed as frames.
              for (const name of redacted.propertyNames) {
                if (name.includes('\n')) stack = stack.split(name).join(REDACTED);
              }
              stack = redactText(stack.replace(err.message, redactText(err.message, true)));
            }
            const telemetryError = Object.create(Object.getPrototypeOf(err), Object.getOwnPropertyDescriptors(err));
            if (stack) {
              Object.defineProperty(telemetryError, 'stack', {
                value: stack,
                writable: true,
                configurable: true,
                enumerable: false,
              });
            }
            Sentry.captureException(telemetryError);
          } else {
            Sentry.captureException(err);
          }
        });
      }
    },
  }),
});
