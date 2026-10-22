import { ApolloServerPlugin } from '@apollo/server';
import * as Sentry from '@sentry/node';
import { Kind, parse, print, visit, type DocumentNode, type ValueNode } from 'graphql';

const SECRET_ARGUMENTS: Record<string, true> = { apiKey: true, braveApiKey: true };
const REDACTED = '[REDACTED]';
// Sentry names its protocol identity fields exactly where it uses them, so
// redaction knows them by path instead of by leaf key: `event.type`, the trace
// context's ids, each span's ids, and the exception class. An input key spelled
// the same way elsewhere gets no identity for free.
const TRACE_IDENTITY_KEYS: Record<string, true> = {
  trace_id: true,
  span_id: true,
  parent_span_id: true,
};
// Attribute keys the OpenTelemetry HTTP instrumentation derives from Cookie or
// Set-Cookie headers embed the cookie name, which is user input.
const SPAN_COOKIE_ATTRIBUTE_PREFIXES = ['http.request.header.cookie.', 'http.request.header.set_cookie.'];

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
        if (!Array.isArray(value)) collectPropertyName(key);
        collectSecret(nestedValue);
      }
    }
  };
  const collectPropertyName = (name: string) => {
    if (!name) return;
    propertyNames.add(name);
    propertyNames.add(JSON.stringify(name).slice(1, -1));
  };
  // Literal collection walks the original value node: the JS object conversion
  // collapses duplicate ObjectFields to their last value, drops nested Variable
  // fields entirely, and would lose the earlier secret before redaction runs.
  const collectLiteralOccurrences = (value: ValueNode) => {
    visit(value, {
      ObjectField(node) {
        collectPropertyName(node.name.value);
      },
      StringValue(node) {
        collectSecret(node.value);
      },
      EnumValue(node) {
        collectSecret(node.value);
      },
      Variable(node) {
        secretVariables.add(node.name.value);
        collectSecret(variables?.[node.name.value]);
      },
    });
  };
  let redactedDocument = visit(document, {
    Argument(node) {
      if (!Object.prototype.hasOwnProperty.call(SECRET_ARGUMENTS, node.name.value)) return;
      if (node.value.kind === Kind.VARIABLE) {
        secretVariables.add(node.value.name.value);
        collectSecret(variables?.[node.value.name.value]);
      } else {
        collectLiteralOccurrences(node.value);
      }
      return { ...node, value: { kind: Kind.STRING, value: REDACTED } };
    },
  });
  redactedDocument = visit(redactedDocument, {
    VariableDefinition(node) {
      if (!secretVariables.has(node.variable.name.value) || !node.defaultValue) return;
      collectLiteralOccurrences(node.defaultValue);
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
    secrets,
    propertyNames,
  };
}

function createCredentialRedactors(secrets: ReadonlySet<string>, propertyNames: ReadonlySet<string>) {
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
  // Whole-key comparison folds only percent hex digits to one case; real
  // letters keep their case, so `providerCredential` stays distinct from
  // `ProviderCredential` and unrelated keys stay unredacted.
  const foldPercentHex = (key: string) => key.replace(/%[\dA-Fa-f]{2}/g, octet => octet.toLowerCase());
  const wholeKeySecrets = new Set([...encodedSecrets.keys()].map(foldPercentHex));
  // Actual secret values are sensitive even inside a longer key. Property
  // names only match whole keys, so short rejected names such as `id` do not
  // corrupt unrelated GraphQL variables such as `providerCredential`.
  const redactKey = (key: string) => {
    if (wholeKeySecrets.has(foldPercentHex(key))) return REDACTED;
    for (const { pattern, inputOnly } of patterns) {
      if (!inputOnly) key = key.replace(pattern, REDACTED);
    }
    return key;
  };
  // Sentry lowercases cookie names and maps hyphens to underscores when it
  // embeds them in span attribute keys. These variants belong only to that
  // suffix boundary, never to general secret matching or input bag keys.
  const cookieNamePatterns = [
    ...patterns.map(({ pattern }) => pattern.source),
    ...[...encodedSecrets.keys()].map(secret =>
      secret
        .toLowerCase()
        .replace(/-/g, '_')
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    ),
  ].sort((a, b) => b.length - a.length);
  const cookieNamePattern = cookieNamePatterns.length ? new RegExp(cookieNamePatterns.join('|'), 'g') : undefined;
  const redactSpanCookieName = (name: string) => (cookieNamePattern ? name.replace(cookieNamePattern, REDACTED) : name);
  return { redactText, redactKey, redactSpanCookieName };
}

/** Keep SDK protocol identity separate from free-form request, error and log copies. */
function redactCredentialEvent<T extends Sentry.Event>(
  event: T,
  redactText: (value: string, input?: boolean) => string,
  redactKey: (key: string) => string,
  redactSpanCookieName: (name: string) => string,
  transactionHeader = event.request?.headers?.['x-transaction-id'] ??
    event.sdkProcessingMetadata?.normalizedRequest?.headers?.['x-transaction-id']
): T {
  const redacted: T = JSON.parse(JSON.stringify(event));
  // Strings are treated by where they live, not by how their key is spelled:
  // - value copies keep secret *values* out but preserve ContextLines source
  //   context, protocol keys and fixed diagnostic vocabulary;
  // - input copies additionally remove rejected property names from echoed
  //   text and whole bag keys, and secret values from any part of bag keys;
  // - request copies preserve header names while sanitizing header values and
  //   cookie names/values, which are user input.
  const walkValue = (value: unknown): unknown => {
    if (typeof value === 'string') return redactText(value);
    if (Array.isArray(value)) return value.map(walkValue);
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, walkValue(nested)]));
    }
    return value;
  };
  const walkInput = (value: unknown, consoleDiagnostic = false): unknown => {
    if (typeof value === 'string') return redactText(value, true);
    if (Array.isArray(value)) return value.map(nested => walkInput(nested, consoleDiagnostic));
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([key, nested]) => [
          redactKey(key),
          // The GraphQL console diagnostic's stack-derived callSite is not an
          // input echo: preserve /graphql/type/scalars.js when `type` is a
          // rejected property name, but still remove actual secret values.
          consoleDiagnostic && key === 'callSite' && typeof nested === 'string'
            ? redactText(nested)
            : walkInput(nested, consoleDiagnostic),
        ])
      );
    }
    return value;
  };
  const walkSpanData = (value: unknown): unknown => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return walkValue(value);
    return Object.fromEntries(
      Object.entries(value).map(([attribute, nested]) => {
        for (const prefix of SPAN_COOKIE_ATTRIBUTE_PREFIXES) {
          if (attribute.startsWith(prefix)) {
            return [`${prefix}${redactSpanCookieName(attribute.slice(prefix.length))}`, walkInput(nested)];
          }
        }
        // Preserve fixed method/path diagnostics even when rejected property
        // names collide, but URL searches/fragments are always input copies.
        if (
          typeof nested === 'string' &&
          (attribute === 'http.method' ||
            attribute === 'http.target' ||
            attribute === 'http.url' ||
            attribute === 'http.route')
        ) {
          if (attribute === 'http.target' || attribute === 'http.url') nested = nested.split(/[?#]/)[0];
          return [attribute, redactText(nested)];
        }
        return [attribute, walkInput(nested)];
      })
    );
  };
  const redactRequest = (request: Sentry.Event['request']): void => {
    if (!request) return;
    if (request.headers) {
      for (const [name, header] of Object.entries(request.headers)) {
        if (typeof header === 'string') request.headers[name] = redactText(header, true);
      }
    }
    if (request.cookies) {
      request.cookies = Object.fromEntries(
        Object.entries(request.cookies).map(([name, cookie]) => [redactText(name, true), walkInput(cookie)])
      ) as typeof request.cookies;
    }
    for (const key of Object.keys(request) as (keyof typeof request)[]) {
      if (key === 'headers' || key === 'cookies') continue;
      request[key] = walkValue(request[key]) as never;
    }
  };

  if (redacted.contexts) {
    const exceptionTypes = new Set(redacted.exception?.values?.map(exception => exception.type));
    for (const name of Object.keys(redacted.contexts)) {
      if (name === 'trace') continue;
      // ExtraErrorData copies each error's own properties under its class name.
      // Other SDK contexts keep fixed property names, even when a rejected
      // credential object happens to use `name` or `version` as a property.
      redacted.contexts[name] = (
        exceptionTypes.has(name) ? walkInput(redacted.contexts[name]) : walkValue(redacted.contexts[name])
      ) as (typeof redacted.contexts)[string];
    }
    const trace = redacted.contexts.trace;
    if (trace) {
      for (const key of Object.keys(trace) as (keyof typeof trace)[]) {
        if (Object.prototype.hasOwnProperty.call(TRACE_IDENTITY_KEYS, key)) continue;
        trace[key] = (key === 'data' ? walkSpanData(trace[key]) : walkValue(trace[key])) as never;
      }
    }
  }
  if (redacted.extra) redacted.extra = walkInput(redacted.extra) as typeof redacted.extra;
  // Apollo names error events from this header, even after one operation's
  // processor has partially redacted it. The final hook must apply the whole
  // batch's credentials again. Real incoming transactions are named from the
  // request line by the SDK's http.server instrumentation, never from this
  // header, so an identical string is still the route diagnostic — while
  // transactions without that trace op keep the header-copy policy.
  if (
    typeof redacted.transaction === 'string' &&
    transactionHeader &&
    !(redacted.type === 'transaction' && redacted.contexts?.trace?.op === 'http.server') &&
    (redacted.type !== 'transaction' || redacted.transaction === transactionHeader)
  ) {
    redacted.transaction = redactText(redacted.transaction, true);
  }
  if (typeof redacted.message === 'string') redacted.message = redactText(redacted.message, true);
  for (const exception of redacted.exception?.values ?? []) {
    if (exception.value) exception.value = redactText(exception.value, true);
    for (const key of Object.keys(exception) as (keyof typeof exception)[]) {
      if (key === 'type' || key === 'value') continue;
      exception[key] = walkValue(exception[key]) as never;
    }
  }
  for (const breadcrumb of redacted.breadcrumbs ?? []) {
    if (breadcrumb.message) breadcrumb.message = redactText(breadcrumb.message, true);
    if (breadcrumb.data) {
      const consoleDiagnostic =
        breadcrumb.category === 'console' && breadcrumb.data.arguments?.[0] === '[GraphQL Error]';
      breadcrumb.data = walkInput(breadcrumb.data, consoleDiagnostic) as typeof breadcrumb.data;
    }
    for (const key of Object.keys(breadcrumb) as (keyof typeof breadcrumb)[]) {
      if (key === 'message' || key === 'data') continue;
      breadcrumb[key] = walkValue(breadcrumb[key]) as never;
    }
  }
  for (const span of redacted.spans ?? []) {
    for (const key of Object.keys(span) as (keyof typeof span)[]) {
      if (Object.prototype.hasOwnProperty.call(TRACE_IDENTITY_KEYS, key)) continue;
      span[key] = (key === 'data' ? walkSpanData(span[key]) : walkValue(span[key])) as never;
    }
  }
  redactRequest(redacted.request);
  if (redacted.sdkProcessingMetadata) {
    const metadata = redacted.sdkProcessingMetadata;
    for (const key of Object.keys(metadata) as (keyof typeof metadata)[]) {
      if (key === 'normalizedRequest') redactRequest(metadata.normalizedRequest);
      else metadata[key] = walkValue(metadata[key]) as never;
    }
  }
  for (const key of Object.keys(redacted) as (keyof T)[]) {
    if (
      key === 'event_id' ||
      key === 'type' ||
      key === 'contexts' ||
      key === 'extra' ||
      key === 'message' ||
      key === 'exception' ||
      key === 'breadcrumbs' ||
      key === 'spans' ||
      key === 'request' ||
      key === 'sdkProcessingMetadata'
    ) {
      continue;
    }
    redacted[key] = walkValue(redacted[key]) as never;
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
  const { redactText, redactKey, redactSpanCookieName } = createCredentialRedactors(secrets, propertyNames);
  const redacted = redactCredentialEvent(sendingEvent, redactText, redactKey, redactSpanCookieName);
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
      const { redactText, redactKey, redactSpanCookieName } = createCredentialRedactors(
        redacted.secrets,
        redacted.propertyNames
      );

      for (const err of ctx.errors) {
        // Add scoped report details and send to Sentry
        Sentry.withScope(scope => {
          // Annotate whether failing operation was query/mutation/subscription
          scope.setTag('kind', ctx.operation?.operation);

          scope.setExtra('query', redacted.query);
          scope.setExtra('variables', redacted.variables);

          // Protect operation diagnostics here; leave request copies intact until the
          // common egress policy has identified credentials from the entire batch.
          const transactionId = ctx.request.http?.headers.get('x-transaction-id');
          scope.addEventProcessor(event => {
            const { request, sdkProcessingMetadata, ...diagnostics } = event;
            const redactedEvent = redactCredentialEvent(
              diagnostics,
              redactText,
              redactKey,
              redactSpanCookieName,
              transactionId
            );
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

          if (transactionId) {
            scope.setTransactionName(transactionId);
          }

          // Redact before the SDK parses the stack: a multiline property name can
          // otherwise become a frame whose function/filename is only part of the secret.
          // Leave Apollo's original error and its public response untouched.
          if (redacted.secrets.size > 0 || redacted.propertyNames.size > 0) {
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
