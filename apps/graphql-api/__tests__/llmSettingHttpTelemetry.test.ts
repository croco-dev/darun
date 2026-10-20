import 'reflect-metadata';
import { HeaderMap, type ApolloServer } from '@apollo/server';
import type { LlmSetting, LlmSettingRepository } from '@darun/translation-domain';
import { LlmSettingService } from '@darun/translation-service';
import { createServer as createApolloServer } from '@darun/utils-apollo-server';
import { AuthRole } from '@darun/utils-apollo-server';
import { createSentryApolloLogPlugin, sentryRequestRedaction } from '@darun/utils-sentry';
import * as Sentry from '@sentry/node';
import bodyParser from 'body-parser';
import type * as GraphQL from 'graphql';
import { Authorized, Mutation, Resolver } from 'type-graphql';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createServer, request, type Server } from 'node:http';
import { createRequire } from 'node:module';
import { LlmSettingResolver } from '../../../libs/translation/feature/src/LlmSetting.resolver';

const { GraphQLError } = createRequire(`${process.cwd()}/package.json`)('graphql') as typeof GraphQL;

@Resolver()
class HttpDiagnosticResolver {
  settingConsoleCollected?: Promise<void>;

  @Authorized([AuthRole.Admin])
  @Mutation(() => String)
  diagnosticSuccess(): string {
    return 'HTTP fixture ready';
  }

  @Authorized([AuthRole.Admin])
  @Mutation(() => String)
  async diagnosticFailure(): Promise<never> {
    await this.settingConsoleCollected;
    throw new GraphQLError('Synthetic HTTP search failure: index unavailable', {
      extensions: { code: 'HTTP_SEARCH_FIXTURE_FAILED', diagnostic: 'retry HTTP index fixture' },
    });
  }
}
// Keep credentials out of source context while retaining the existing masking oracle.
const apiKey = `synthetic-http-provider-${randomUUID()}-+/= a71c`;
const braveApiKey = `synthetic-http-brave-${randomUUID()}-/+= b92d`;
const environmentKey = `synthetic-http-environment-${randomUUID()}`;
const endpoint = 'https://public-provider.example.com/v1';
const model = 'fixture/http-non-sensitive-model';
const selection = '{ apiKeyMasked braveApiKeyMasked model }';
const diagnostic = { query: 'mutation HttpDiagnostics { unrelated: diagnosticFailure }' };
const ready = { query: 'mutation HttpReady { diagnosticSuccess }' };
const consoleDiagnostics: unknown[][] = [];
const arraySecret = `synthetic-http-array-${randomUUID()}`;
const objectSecret = `synthetic-http-object-${randomUUID()}`;
const nestedSecret = `synthetic-http-nested-${randomUUID()}`;
const escapedSecret = `synthetic-http-escaped-${randomUUID()}-"quote"-\\slash-\nline`;
const mapSecret = `synthetic-http-map-${randomUUID()}`;
const nestedMapSecret = `synthetic-http-nested-map-${randomUUID()}`;
const frameSecret = `synthetic-http-frame-${randomUUID()}`;
const multilineProperty = `synthetic-http-property-${randomUUID()}\n    at ${frameSecret} (marker)\nend`;
const escapedProperty = `synthetic-http-property-${randomUUID()}-"quote"-\\slash-\\nline`;
const coercionCases = [
  { name: 'array', value: [arraySecret], secrets: [arraySecret], echoed: [arraySecret] },
  { name: 'object', value: { token: objectSecret }, secrets: [objectSecret], echoed: [objectSecret] },
  {
    name: 'type/id protocol properties',
    value: { type: objectSecret, id: nestedSecret },
    secrets: [objectSecret, nestedSecret],
    echoed: [objectSecret, nestedSecret],
  },
  {
    name: 'nested and escaped',
    value: { tokens: [nestedSecret], nested: { token: escapedSecret } },
    secrets: [nestedSecret, escapedSecret],
    echoed: [nestedSecret, JSON.stringify(escapedSecret).slice(1, -1)],
  },
  { name: 'credential-keyed map', value: { [mapSecret]: false }, secrets: [mapSecret], echoed: [mapSecret] },
  {
    name: 'nested credential-keyed map',
    value: { mapping: { [nestedMapSecret]: true } },
    secrets: [nestedMapSecret],
    echoed: [nestedMapSecret],
  },
  {
    name: 'multiline fake-frame property',
    value: { [multilineProperty]: false },
    secrets: [multilineProperty, frameSecret],
    echoed: [multilineProperty],
  },
  {
    name: 'escaped property',
    value: { [escapedProperty]: false },
    secrets: [escapedProperty],
    echoed: [escapedProperty],
  },
];

interface Operation {
  query: string;
  variables?: Record<string, unknown>;
}
interface Result {
  data?: Record<string, unknown> | null;
  errors?: { message: string; path: string[]; extensions: { code: string } }[];
}

function saveOperation(encoding: 'variables' | 'inline' | 'defaults'): Operation {
  if (encoding === 'inline')
    return {
      query: `mutation HttpSave { saved: updateLlmSetting(endpoint: "${endpoint}", model: "${model}", apiKey: "${apiKey}", braveApiKey: "${braveApiKey}") ${selection} }`,
    };
  const defaults = encoding === 'defaults';
  return {
    query: `mutation HttpSave($providerCredential: String${defaults ? ` = "${apiKey}"` : ''}, $searchCredential: String${defaults ? ` = "${braveApiKey}"` : ''}) {
      saved: updateLlmSetting(endpoint: "${endpoint}", model: "${model}", apiKey: $providerCredential, braveApiKey: $searchCredential) ${selection}
    }`,
    ...(defaults ? {} : { variables: { providerCredential: apiKey, searchCredential: braveApiKey } }),
  };
}

// Run this file in an isolated Vitest fork: SDK instrumentation and the ephemeral HTTP
// server belong to that process. No database, provider, or Sentry network transport is used.
describe('HTTP batches through the registered Apollo Sentry boundary', () => {
  let apollo: ApolloServer;
  let httpServer: Server;
  let port: number;
  const events: Sentry.Event[] = [];
  const transactions: Sentry.Event[] = [];
  const envelopes: Sentry.Envelope[] = [];
  const integrationBodies: unknown[] = [];
  const transactionBodies: unknown[] = [];
  const sdkErrorDiagnostics: {
    eventId?: string;
    stack?: string;
    exception: Sentry.Event['exception'];
  }[] = [];
  const transportSend = vi.fn(async (envelope: Sentry.Envelope) => {
    envelopes.push(envelope);
    for (const [header, payload] of envelope[1]) {
      if (header.type === 'event') events.push(payload as Sentry.Event);
      if (header.type === 'transaction') transactions.push(payload as Sentry.Event);
    }
    return {};
  });
  const diagnosticResolver = new HttpDiagnosticResolver();
  let settingResolver: LlmSettingResolver;
  let settingConsoleArguments: unknown[] | undefined;
  let collectSettingConsole: ((args: unknown[]) => void) | undefined;
  let cancelSettingConsole: (() => void) | undefined;
  const repository: LlmSettingRepository = {
    findSetting: vi.fn(async () => null),
    upsertSetting: vi.fn(
      async input =>
        ({
          id: 'default',
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-01'),
          ...input,
        }) as LlmSetting
    ),
  };

  beforeAll(async () => {
    expect(process.versions.node.split('.')[0], 'HTTP telemetry requires the production Node 22 runtime').toBe('22');
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      consoleDiagnostics.push(args);
      // Console instrumentation records its breadcrumb before calling this spy.
      collectSettingConsole?.(args);
    });
    Sentry.init({
      dsn: 'https://synthetic@telemetry.invalid/1',
      integrations: [Sentry.extraErrorDataIntegration({ depth: 5 })],
      // Only this synthetic fixture samples every request; production remains at 0.1.
      tracesSampleRate: 1,
      ...sentryRequestRedaction,
      beforeSend: (event, hint) => {
        // Snapshot actual SDK output, not an invented event. Observe both sides of
        // the common boundary so a lost stack cannot be excused as GET behavior.
        sdkErrorDiagnostics.push({
          eventId: event.event_id,
          stack: hint.originalException instanceof Error ? hint.originalException.stack : undefined,
          exception: event.exception ? JSON.parse(JSON.stringify(event.exception)) : undefined,
        });
        return sentryRequestRedaction.beforeSend(event);
      },
      sendClientReports: false,
      transport: () => ({ send: transportSend, flush: async () => true }),
    });
    const client = Sentry.getClient();
    expect(client?.getIntegrationByName('Console')).toBeDefined();
    expect(client?.getIntegrationByName('Http')).toBeDefined();
    expect(client?.getIntegrationByName('RequestData')).toBeDefined();
    expect(client?.getIntegrationByName('ContextLines')).toBeDefined();
    // Observe the real RequestData input before the common send boundary. Transactions
    // must be produced by incoming HTTP instrumentation, never startTransaction fixtures.
    client?.addEventProcessor(event => {
      if (event.type === 'transaction') transactionBodies.push(event.request?.data);
      else integrationBodies.push(event.request?.data);
      return event;
    });
    vi.stubEnv('OPEN_ROUTER_API_KEY', environmentKey);
    settingResolver = new LlmSettingResolver(new LlmSettingService(repository));
    vi.spyOn(settingResolver, 'updateLlmSetting');
    apollo = createApolloServer({
      options: {
        resolvers: [LlmSettingResolver, HttpDiagnosticResolver],
        container: {
          get: target => (target === HttpDiagnosticResolver ? diagnosticResolver : settingResolver),
        },
        authChecker: ({ context }) => context.admin === true,
      },
      config: { playground: false, plugins: [createSentryApolloLogPlugin()] },
    });
    await apollo.start();
    const jsonParser = bodyParser.json();
    httpServer = createServer((req, res) => {
      // Match local-server's JSON middleware, including its async request context binding.
      jsonParser(req, res, parseError => {
        if (parseError) {
          res.statusCode = 400;
          res.end(String(parseError));
          return;
        }
        const body = 'body' in req ? req.body : undefined;
        const headers = new HeaderMap();
        for (const [key, value] of Object.entries(req.headers)) {
          if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
        }
        void apollo
          .executeHTTPGraphQLRequest({
            httpGraphQLRequest: {
              method: req.method ?? 'POST',
              headers,
              search: new URL(req.url ?? '/', 'http://fixture.invalid').search,
              body,
            },
            context: async () => ({ admin: req.headers['x-fixture-admin'] !== 'false' }),
          })
          .then(response => {
            if (response.body.kind !== 'complete') throw new Error('Expected a complete HTTP fixture response');
            res.statusCode = response.status ?? 200;
            for (const [key, value] of response.headers) res.setHeader(key, value);
            res.end(response.body.string);
          })
          .catch(error => {
            res.statusCode = 500;
            res.end(String(error));
          });
      });
    });
    await new Promise<void>(resolve => httpServer.listen(0, '127.0.0.1', resolve));
    const address = httpServer.address();
    if (!address || typeof address === 'string') throw new Error('Expected an ephemeral TCP port');
    port = address.port;
  });

  beforeEach(() => {
    events.length = 0;
    transactions.length = 0;
    envelopes.length = 0;
    transactionBodies.length = 0;
    integrationBodies.length = 0;
    consoleDiagnostics.length = 0;
    sdkErrorDiagnostics.length = 0;
    // A breadcrumb from an earlier HTTP request must never satisfy the batch oracle.
    Sentry.getIsolationScope().clearBreadcrumbs();
    Sentry.getCurrentScope().clearBreadcrumbs();
    settingConsoleArguments = undefined;
    collectSettingConsole = undefined;
    cancelSettingConsole = undefined;
    diagnosticResolver.settingConsoleCollected = undefined;
    vi.mocked(settingResolver.updateLlmSetting).mockClear();
    vi.stubEnv('OPEN_ROUTER_API_KEY', environmentKey);
    vi.mocked(repository.findSetting).mockClear();
    vi.mocked(repository.upsertSetting).mockClear();
  });

  afterAll(async () => {
    if (httpServer) {
      await new Promise<void>((resolve, reject) => httpServer.close(error => (error ? reject(error) : resolve())));
    }
    await apollo?.stop();
    await Sentry.close(2000);
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    expect(transportSend).toHaveBeenCalled();
  });

  function waitForSettingConsole(code: string) {
    diagnosticResolver.settingConsoleCollected = new Promise<void>(resolve => {
      cancelSettingConsole = resolve;
      collectSettingConsole = args => {
        const diagnostic = args[1];
        if (
          args[0] === '[GraphQL Error]' &&
          typeof diagnostic === 'object' &&
          diagnostic !== null &&
          'code' in diagnostic &&
          diagnostic.code === code
        ) {
          settingConsoleArguments = args;
          collectSettingConsole = undefined;
          cancelSettingConsole = undefined;
          resolve();
        }
      };
    });
  }

  async function send(
    body: Operation | Operation[] | undefined,
    admin = true,
    expectedStatus = 200,
    expectedEventCount = 1,
    search = ''
  ): Promise<Result | Result[]> {
    const rawBody = body === undefined ? undefined : JSON.stringify(body);
    const method = body === undefined ? 'GET' : 'POST';
    const response = await new Promise<string>((resolve, reject) => {
      const req = request(
        {
          host: '127.0.0.1',
          port,
          path: `/graphql${search}`,
          method,
          headers: {
            'content-type': 'application/json',
            'x-fixture-admin': String(admin),
            'x-fixture-diagnostic': 'http-fixture',
          },
        },
        res => {
          if (res.statusCode !== expectedStatus) {
            res.resume();
            reject(new Error(`Expected HTTP ${expectedStatus}, received ${res.statusCode}`));
            return;
          }
          if (method === 'GET' && res.headers.allow !== 'POST') {
            res.resume();
            reject(new Error('GET mutation rejection must retain Allow: POST'));
            return;
          }
          const chunks: Buffer[] = [];
          res.on('data', chunk => chunks.push(Buffer.from(chunk)));
          res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
          res.on('error', reject);
        }
      );
      // A real socket deadline bounds this integration fixture; fake timers cannot drive TCP I/O.
      req.setTimeout(2000, () => req.destroy(new Error('HTTP fixture timed out')));
      req.on('error', error => {
        // Let Apollo finish a waiting resolver on socket failure, but never pass the HTTP assertion.
        cancelSettingConsole?.();
        cancelSettingConsole = undefined;
        collectSettingConsole = undefined;
        reject(error);
      });
      req.end(rawBody);
    });
    expect(await Sentry.flush(2000)).toBe(true);
    expect(transportSend).toHaveBeenCalled();
    expect(events).toHaveLength(expectedEventCount);
    expect(integrationBodies).toEqual(Array.from({ length: expectedEventCount }, () => rawBody));
    expect(sdkErrorDiagnostics).toHaveLength(expectedEventCount);
    for (const event of events) {
      const sdk = sdkErrorDiagnostics.find(diagnostic => diagnostic.eventId === event.event_id);
      expect(sdk).toBeDefined();
      expect(event.event_id).toMatch(/^[a-f0-9]{32}$/);
      expect(event.timestamp).toBeGreaterThan(0);
      expect(event.contexts?.trace).toMatchObject({
        trace_id: expect.stringMatching(/^[a-f0-9]{32}$/),
        span_id: expect.stringMatching(/^[a-f0-9]{16}$/),
      });
      expect(event.exception?.values?.[0].type).toEqual(sdk?.exception?.values?.[0].type);
      expect(event.exception?.values?.[0].type).toEqual(expect.stringContaining('Error'));
      expect(event.exception?.values?.[0].stacktrace?.frames).toEqual(sdk?.exception?.values?.[0].stacktrace?.frames);
    }
    const transaction = transactions.find(event => event.contexts?.trace?.op === 'http.server');
    expect(transaction, 'A real incoming HTTP transaction must reach the capture transport').toBeDefined();
    expect(transaction?.type).toBe('transaction');
    expect(transaction?.event_id).toMatch(/^[a-f0-9]{32}$/);
    expect(envelopes.flatMap(envelope => envelope[1].map(([header]) => header.type))).toContain('transaction');
    expect(transaction?.transaction).toBe(`${method} /graphql`);
    expect(transaction?.request).toMatchObject({
      method,
      url: `http://127.0.0.1:${port}/graphql`,
      headers: expect.objectContaining({ 'x-fixture-diagnostic': 'http-fixture' }),
    });
    expect(transaction?.request?.data).toBeUndefined();
    expect(transaction?.request?.query_string).toBeUndefined();
    expect(transaction?.contexts?.trace).toMatchObject({
      op: 'http.server',
      trace_id: expect.stringMatching(/^[a-f0-9]{32}$/),
      span_id: expect.stringMatching(/^[a-f0-9]{16}$/),
      data: expect.objectContaining({
        'http.response.status_code': expectedStatus,
        'http.method': method,
        'http.url': `http://127.0.0.1:${port}/graphql`,
        'http.target': '/graphql',
      }),
    });
    expect(transaction?.timestamp).toBeGreaterThan(transaction?.start_timestamp ?? 0);
    if (method === 'POST') expect(transactionBodies).toContain(rawBody);
    expectNoCredentials(envelopes, [apiKey, braveApiKey, environmentKey]);
    expectNoCredentials(consoleDiagnostics, [apiKey, braveApiKey, environmentKey]);
    return JSON.parse(response) as Result | Result[];
  }

  const post = (body: Operation | Operation[], admin = true, status = 200, count = 1) =>
    send(body, admin, status, count);

  function expectProtectedEvent(operation: string, path: string) {
    expect(events).toHaveLength(1);
    const event = events[0];
    const serialized = JSON.stringify(event);
    for (const secret of [apiKey, braveApiKey, environmentKey]) expect(serialized).not.toContain(secret);
    expect(event.request?.data).toBeUndefined();
    expect(event.request).toMatchObject({
      method: 'POST',
      url: `http://127.0.0.1:${port}/graphql`,
      headers: expect.objectContaining({ 'content-type': 'application/json', 'x-fixture-diagnostic': 'http-fixture' }),
    });
    expect(event.extra?.query).toContain(operation);
    expect(event.tags?.kind).toBe('mutation');
    expect(event.breadcrumbs).toContainEqual(expect.objectContaining({ category: 'query-path', message: path }));
    expect(event.exception?.values?.[0].stacktrace?.frames?.length).toBeGreaterThan(0);
  }

  function expectNoCredentials(value: unknown, secrets: readonly string[]) {
    const serialized = JSON.stringify(value);
    for (const secret of secrets) {
      expect(serialized).not.toContain(secret);
      expect(serialized).not.toContain(JSON.stringify(secret).slice(1, -1));
      expect(serialized).not.toContain(JSON.stringify(JSON.stringify(secret).slice(1, -1)).slice(1, -1));
      expect(serialized).not.toContain(encodeURIComponent(secret));
      expect(serialized).not.toContain(encodeURI(secret));
      expect(serialized).not.toContain(new URLSearchParams({ value: secret }).toString().slice('value='.length));
      // Decode the captured representation independently of production's replacement
      // patterns, so full/mixed/lowercase percent encoding cannot fool the absence oracle.
      const inspect = (value: unknown): void => {
        if (typeof value === 'string') {
          const candidates = [value, value.replace(/\+/g, ' ')];
          for (const candidate of candidates) {
            try {
              const decoded = decodeURIComponent(candidate);
              expect(decoded).not.toContain(secret);
              expect(decoded).not.toContain(JSON.stringify(secret).slice(1, -1));
            } catch (error) {
              if (!(error instanceof URIError)) throw error;
            }
          }
        } else if (value && typeof value === 'object') {
          for (const [key, nested] of Object.entries(value)) {
            inspect(key);
            inspect(nested);
          }
        }
      };
      inspect(value);
    }
  }

  function expectLateDiagnosticEvent(settingCode: string, secrets: readonly string[], settingPath?: string[]) {
    const event = events.find(event => String(event.extra?.query).includes('HttpDiagnostics'));
    expect(event).toBeDefined();
    if (!event) throw new Error('Expected the late HttpDiagnostics SDK event');
    expect(event.tags?.kind).toBe('mutation');
    expect(event.breadcrumbs).toContainEqual(expect.objectContaining({ category: 'query-path', message: 'unrelated' }));
    expect(event.exception?.values?.[0].value).toBe('Synthetic HTTP search failure: index unavailable');
    expect(event.exception?.values?.[0].stacktrace?.frames?.length).toBeGreaterThan(0);
    // Node 22's actual fixture frame points at the added await. Require this
    // diagnostic function/file and its own pre/context/post source together;
    // another frame or an earlier request cannot satisfy the source oracle.
    expect(event.exception?.values?.[0].stacktrace?.frames).toContainEqual(
      expect.objectContaining({
        function: expect.stringMatching(/^HttpDiagnosticResolver\d*\.diagnosticFailure$/),
        filename: expect.stringContaining('llmSettingHttpTelemetry.test.ts'),
        lineno: expect.any(Number),
        pre_context: expect.arrayContaining([expect.stringContaining('async diagnosticFailure()')]),
        context_line: expect.stringContaining('await this.settingConsoleCollected;'),
        post_context: expect.arrayContaining([
          expect.stringContaining("throw new GraphQLError('Synthetic HTTP search failure: index unavailable'"),
        ]),
      })
    );
    expect(JSON.stringify(event)).toContain('HTTP_SEARCH_FIXTURE_FAILED');
    expect(JSON.stringify(event)).toContain('retry HTTP index fixture');
    expect(event.request?.data).toBeUndefined();
    expect(event.sdkProcessingMetadata?.normalizedRequest?.data).toBeUndefined();
    expect(event.request).toMatchObject({
      method: 'POST',
      url: `http://127.0.0.1:${port}/graphql`,
      headers: expect.objectContaining({ 'x-fixture-diagnostic': 'http-fixture' }),
    });
    expect(settingConsoleArguments).toEqual([
      '[GraphQL Error]',
      expect.objectContaining({
        code: settingCode,
        callSite: expect.stringMatching(/^\s+at .+:\d+:\d+\)?$/),
        locations: expect.arrayContaining([
          expect.objectContaining({ line: expect.any(Number), column: expect.any(Number) }),
        ]),
        path: settingPath,
      }),
    ]);
    const settingDiagnostic = settingConsoleArguments?.[1] as {
      callSite: string;
      locations: readonly GraphQL.SourceLocation[];
    };
    for (const { line, column } of settingDiagnostic.locations) {
      expect(Number.isInteger(line)).toBe(true);
      expect(line).toBeGreaterThan(0);
      expect(Number.isInteger(column)).toBe(true);
      expect(column).toBeGreaterThan(0);
    }
    expectNoCredentials(settingConsoleArguments, secrets);
    // Scopes were cleared before this request and the diagnostic resolver waited for this exact log.
    // The SDK normalizes breadcrumb.data at its default depth 3: arguments retains its
    // diagnostic object and scalar code/callSite, but that object's arrays reach depth 0.
    // Check raw path/locations above before requiring their SDK representation below.
    // The plugin's JSON copy omits undefined paths for coercion errors before normalization.
    const breadcrumb = event.breadcrumbs?.find(
      crumb =>
        crumb.category === 'console' &&
        crumb.data?.arguments?.[1]?.code === settingCode &&
        crumb.data.arguments[1].callSite === settingDiagnostic.callSite
    );
    expect(breadcrumb).toBeDefined();
    expect(breadcrumb?.data?.arguments).toEqual([
      '[GraphQL Error]',
      {
        code: settingCode,
        callSite: settingDiagnostic.callSite,
        ...(settingPath === undefined ? {} : { path: '[Array]' }),
        locations: '[Array]',
      },
    ]);
    expectNoCredentials(breadcrumb, secrets);
    expectNoCredentials(event, secrets);
  }

  for (const encoding of ['variables', 'inline', 'defaults'] as const) {
    for (const order of ['single', 'save first', 'save last']) {
      it(`${encoding}: ${order} saves without an error and still sends a protected real HTTP transaction`, async () => {
        const save = saveOperation(encoding);
        const response = await post(
          order === 'single' ? save : order === 'save first' ? [save, ready] : [ready, save],
          true,
          200,
          0
        );
        const saved = Array.isArray(response) ? response[order === 'save first' ? 0 : 1] : response;
        expect(Array.isArray(response)).toBe(order !== 'single');
        expect(saved).toEqual({
          data: { saved: { apiKeyMasked: 'synt...****a71c', braveApiKeyMasked: 'synt...****b92d', model } },
        });
        if (Array.isArray(response)) {
          expect(response[order === 'save first' ? 1 : 0]).toEqual({
            data: { diagnosticSuccess: 'HTTP fixture ready' },
          });
        }
        expect(repository.upsertSetting).toHaveBeenCalledOnce();
        expect(repository.upsertSetting).toHaveBeenCalledWith(expect.objectContaining({ apiKey, braveApiKey }));
        expect(consoleDiagnostics).toEqual([]);
        expect(events).toEqual([]);
      });
    }
    for (const uriEncoding of ['form', 'percent', 'all bytes'] as const) {
      it(`${encoding}: GET ${uriEncoding} is rejected with 405 and never stores encoded credentials`, async () => {
        const operation = saveOperation(encoding);
        const params = {
          query: operation.query,
          ...(operation.variables ? { variables: JSON.stringify(operation.variables) } : {}),
        };
        const encode = (value: string) =>
          uriEncoding === 'all bytes'
            ? [...Buffer.from(value)].map(byte => `%${byte.toString(16).padStart(2, '0')}`).join('')
            : encodeURIComponent(value);
        const search =
          uriEncoding === 'form'
            ? new URLSearchParams(params).toString()
            : Object.entries(params)
                .map(([key, value]) => `${key}=${encode(value)}`)
                .join('&');
        const response = await send(undefined, true, 405, 1, `?${search}`);
        expect(response).toMatchObject({
          errors: [
            {
              message: 'GET requests only support query operations, not mutation operations',
              extensions: { code: 'BAD_REQUEST' },
            },
          ],
        });
        expect(settingResolver.updateLlmSetting).not.toHaveBeenCalled();
        expect(repository.findSetting).not.toHaveBeenCalled();
        expect(repository.upsertSetting).not.toHaveBeenCalled();
        expect(events[0].request).toMatchObject({ method: 'GET', url: `http://127.0.0.1:${port}/graphql` });
        expect(events[0].request?.query_string).toBeUndefined();
        expect(events[0].extra?.query).toContain('HttpSave');
        // Previously the Node 22 lazy stack accessor was copied without its Error
        // storage: the SDK already had no frames before beforeSend. The error copy
        // must now give the SDK a real redacted data-property stack, not fake frames.
        const sdk = sdkErrorDiagnostics.find(diagnostic => diagnostic.eventId === events[0].event_id);
        expect(sdk?.stack).toContain('requestPipeline.js');
        expect(sdk?.exception?.values?.[0].stacktrace?.frames?.length).toBeGreaterThan(0);
        expect(events[0].exception?.values?.[0].type).toBe('BadRequestError');
        expect(events[0].exception?.values?.[0].stacktrace?.frames?.length).toBeGreaterThan(0);
      });
    }
  }

  for (const variable of ['providerCredential', 'searchCredential']) {
    for (const fixture of coercionCases) {
      it(`GET ${variable}: ${fixture.name} is rejected before coercion and its encoded search never leaves`, async () => {
        const operation = saveOperation('variables');
        const search = new URLSearchParams({
          query: operation.query,
          variables: JSON.stringify({ [variable]: fixture.value }),
        });
        const response = await send(undefined, true, 405, 1, `?${search}`);
        expect(response).toMatchObject({ errors: [{ extensions: { code: 'BAD_REQUEST' } }] });
        expect(settingResolver.updateLlmSetting).not.toHaveBeenCalled();
        expect(repository.findSetting).not.toHaveBeenCalled();
        expect(repository.upsertSetting).not.toHaveBeenCalled();
        expectNoCredentials(envelopes, fixture.secrets);
        expectNoCredentials(consoleDiagnostics, fixture.secrets);
        expect(events[0].exception?.values?.[0].type).toBe('BadRequestError');
        expect(events[0].exception?.values?.[0].stacktrace?.frames?.length).toBeGreaterThan(0);
      });
    }
  }

  for (const encoding of ['variables', 'inline', 'defaults'] as const) {
    for (const saveFirst of [true, false]) {
      it(`${encoding}: 저장과 별도 실패 operation의 순서(${saveFirst ? '저장 먼저' : '오류 먼저'})와 무관하게 batch 본문 키를 제거한다`, async () => {
        const save = saveOperation(encoding);
        const response = await post(saveFirst ? [save, diagnostic] : [diagnostic, save]);
        expect(Array.isArray(response)).toBe(true);
        if (!Array.isArray(response)) throw new Error('Expected a batched GraphQL response');
        expect(response[saveFirst ? 0 : 1]).toEqual({
          data: {
            saved: {
              apiKeyMasked: 'synt...****a71c',
              braveApiKeyMasked: 'synt...****b92d',
              model,
            },
          },
        });
        expect(response[saveFirst ? 1 : 0].errors).toEqual([
          expect.objectContaining({
            message: 'Synthetic HTTP search failure: index unavailable',
            path: ['unrelated'],
            extensions: expect.objectContaining({ code: 'HTTP_SEARCH_FIXTURE_FAILED' }),
          }),
        ]);
        expect(repository.upsertSetting).toHaveBeenCalledOnce();
        expectProtectedEvent('HttpDiagnostics', 'unrelated');
        expect(events[0].exception?.values?.[0].value).toBe('Synthetic HTTP search failure: index unavailable');
        expect(JSON.stringify(events[0])).toContain('HTTP_SEARCH_FIXTURE_FAILED');
        expect(JSON.stringify(events[0])).toContain('retry HTTP index fixture');
      });
    }
  }

  it('단건 비민감 오류의 operation, 명시 오류와 HTTP 진단을 유지한다', async () => {
    const response = await post(diagnostic);
    expect(response).toMatchObject({
      errors: [
        expect.objectContaining({ extensions: expect.objectContaining({ code: 'HTTP_SEARCH_FIXTURE_FAILED' }) }),
      ],
    });
    expectProtectedEvent('HttpDiagnostics', 'unrelated');
    expect(repository.upsertSetting).not.toHaveBeenCalled();
  });

  it('단건 비민감 오류의 실제 logger 인자는 원문 message 없이 code·path·호출 위치를 남긴다', async () => {
    await post(diagnostic);
    const snapshot = JSON.stringify(consoleDiagnostics);
    expect(snapshot).not.toContain('Synthetic HTTP search failure: index unavailable');
    expect(consoleDiagnostics).toContainEqual([
      '[GraphQL Error]',
      expect.objectContaining({
        code: 'HTTP_SEARCH_FIXTURE_FAILED',
        path: ['unrelated'],
        callSite: expect.stringMatching(/^\s+at HttpDiagnosticResolver\d*\.diagnosticFailure \(.*:\d+:\d+\)?$/),
      }),
    ]);
    // captureException precedes this operation's formatError; its event cannot prove its own log.
  });

  it('단건 기본값 키와 alias의 인가 거절에서도 전체 SDK 이벤트를 보호한다', async () => {
    const response = await post(saveOperation('defaults'), false);
    expect(response).toMatchObject({
      errors: [expect.objectContaining({ message: expect.stringContaining('Access denied') })],
    });
    expectProtectedEvent('HttpSave', 'saved');
    expect(events[0].extra?.query).toContain('[REDACTED]');
    expect(repository.findSetting).not.toHaveBeenCalled();
    expect(repository.upsertSetting).not.toHaveBeenCalled();
  });

  for (const encoding of ['variables', 'inline', 'defaults'] as const) {
    for (const failure of [
      { kind: 'policy', code: 'LLM_API_KEY_NOT_ALLOWED', message: expect.stringContaining('OPEN_ROUTER_API_KEY') },
      { kind: 'read', code: 'LLM_CONFIG_READ_FAILED', message: '저장된 LLM 설정을 읽지 못했습니다.' },
      { kind: 'write', code: 'LLM_SETTING_SAVE_FAILED', message: 'LLM 설정을 저장하지 못했습니다.' },
    ]) {
      for (const order of ['single', 'setting first', 'setting last']) {
        it(`${encoding}: ${failure.kind}, ${order} retains explicit errors and safe tracing`, async () => {
          if (failure.kind === 'policy') vi.stubEnv('OPEN_ROUTER_API_KEY', apiKey);
          if (failure.kind === 'read')
            vi.mocked(repository.findSetting).mockRejectedValueOnce(new Error(`read failed ${apiKey},${braveApiKey}`));
          if (failure.kind === 'write')
            vi.mocked(repository.upsertSetting).mockRejectedValueOnce(
              new Error(`Failed query: insert llm_settings params ${apiKey},${braveApiKey}`)
            );
          if (order !== 'single') waitForSettingConsole(failure.code);
          const setting = saveOperation(encoding);
          const response = await post(
            order === 'single' ? setting : order === 'setting first' ? [setting, diagnostic] : [diagnostic, setting],
            true,
            200,
            order === 'single' ? 1 : 2
          );
          expect(Array.isArray(response)).toBe(order !== 'single');
          const failedSetting = Array.isArray(response) ? response[order === 'setting first' ? 0 : 1] : response;
          expect(failedSetting).toMatchObject({
            data: null,
            errors: [{ message: failure.message, path: ['saved'], extensions: { code: failure.code } }],
          });
          if (Array.isArray(response)) {
            expect(response[order === 'setting first' ? 1 : 0].errors).toEqual([
              expect.objectContaining({ extensions: expect.objectContaining({ code: 'HTTP_SEARCH_FIXTURE_FAILED' }) }),
            ]);
          }
          expect(settingResolver.updateLlmSetting).toHaveBeenCalledOnce();
          expect(repository.findSetting).toHaveBeenCalledOnce();
          if (failure.kind === 'write') expect(repository.upsertSetting).toHaveBeenCalledOnce();
          else expect(repository.upsertSetting).not.toHaveBeenCalled();
          const settingEvent = events.find(event => String(event.extra?.query).includes('HttpSave'));
          expect(settingEvent).toBeDefined();
          expect(settingEvent?.exception?.values?.[0].value).toEqual(failure.message);
          expect(settingEvent?.extra?.query).toContain('[REDACTED]');
          expect(settingEvent?.breadcrumbs).toContainEqual(
            expect.objectContaining({ category: 'query-path', message: 'saved' })
          );
          expectNoCredentials(events, [apiKey, braveApiKey, environmentKey]);
          expectNoCredentials(envelopes, [apiKey, braveApiKey, environmentKey]);
          if (order !== 'single') {
            expectLateDiagnosticEvent(failure.code, [apiKey, braveApiKey, environmentKey], ['saved']);
          }
        });
      }
    }
  }

  for (const variable of ['providerCredential', 'searchCredential']) {
    for (const fixture of coercionCases) {
      for (const order of ['single', 'coercion first', 'coercion last']) {
        it(`${variable}: ${fixture.name}, ${order} preserves HTTP 400 without sending rejected credentials`, async () => {
          const invalid = saveOperation('variables');
          invalid.variables = { [variable]: fixture.value };
          const body =
            order === 'single' ? invalid : order === 'coercion first' ? [invalid, diagnostic] : [diagnostic, invalid];
          if (order !== 'single') waitForSettingConsole('BAD_USER_INPUT');
          const response = await post(body, true, 400, order === 'single' ? 1 : 2);
          const rejected = Array.isArray(response) ? response[order === 'coercion first' ? 0 : 1] : response;
          expect(rejected.data).toBeUndefined();
          expect(rejected.errors).toEqual([
            expect.objectContaining({
              message: expect.stringContaining('String cannot represent a non string value'),
              extensions: expect.objectContaining({ code: 'BAD_USER_INPUT' }),
            }),
          ]);
          for (const echo of fixture.echoed) expect(rejected.errors?.[0].message).toContain(echo);
          expect(settingResolver.updateLlmSetting).not.toHaveBeenCalled();
          expect(repository.findSetting).not.toHaveBeenCalled();
          expect(repository.upsertSetting).not.toHaveBeenCalled();
          expect(consoleDiagnostics).toContainEqual([
            '[GraphQL Error]',
            expect.objectContaining({
              code: 'BAD_USER_INPUT',
              callSite: expect.stringMatching(/^\s+at .*graphql[/\\]type[/\\]scalars\.js:\d+:\d+\)?$/),
              locations: expect.arrayContaining([
                expect.objectContaining({ line: expect.any(Number), column: expect.any(Number) }),
              ]),
            }),
          ]);
          const serialized = JSON.stringify(events);
          expectNoCredentials(envelopes, [apiKey, braveApiKey, ...fixture.secrets]);
          for (const secret of [apiKey, braveApiKey, ...fixture.secrets]) {
            expect(serialized).not.toContain(secret);
            expect(serialized).not.toContain(JSON.stringify(secret).slice(1, -1));
            expect(serialized).not.toContain(JSON.stringify(JSON.stringify(secret).slice(1, -1)).slice(1, -1));
          }
          for (const event of events) {
            expect(event.request?.data).toBeUndefined();
            expect(event.sdkProcessingMetadata?.normalizedRequest?.data).toBeUndefined();
            expect(event.request).toMatchObject({
              method: 'POST',
              url: `http://127.0.0.1:${port}/graphql`,
              headers: expect.objectContaining({ 'x-fixture-diagnostic': 'http-fixture' }),
            });
            expect(event.tags?.kind).toBe('mutation');
            expect(event.exception?.values?.[0].stacktrace?.frames?.length).toBeGreaterThan(0);
          }
          const coercionEvent = events.find(event => String(event.extra?.query).includes('HttpSave'));
          expect(coercionEvent?.extra?.variables).toEqual({ [variable]: '[REDACTED]' });
          expect(coercionEvent?.exception?.values?.[0].value).toContain('String cannot represent a non string value');
          // Only the input-bearing error message must lose these property names;
          // the SDK's type/event_id/trace_id/span_id fields must remain usable.
          expect(coercionEvent?.exception?.values?.[0].value).not.toMatch(/\b(?:type|id)\s*:/);
          expect(JSON.stringify(coercionEvent)).toContain('BAD_USER_INPUT');
          const consoleSnapshot = JSON.stringify(consoleDiagnostics);
          for (const secret of [apiKey, braveApiKey, ...fixture.secrets]) {
            expect(consoleSnapshot).not.toContain(secret);
            expect(consoleSnapshot).not.toContain(JSON.stringify(secret).slice(1, -1));
            expect(consoleSnapshot).not.toContain(JSON.stringify(JSON.stringify(secret).slice(1, -1)).slice(1, -1));
          }
          expect(consoleSnapshot).not.toContain('String cannot represent a non string value');
          expect(consoleSnapshot).toContain('BAD_USER_INPUT');
          if (order !== 'single') {
            expect(Array.isArray(response)).toBe(true);
            if (!Array.isArray(response)) throw new Error('Expected a batched GraphQL response');
            expect(response[order === 'coercion first' ? 1 : 0].errors).toEqual([
              expect.objectContaining({ extensions: expect.objectContaining({ code: 'HTTP_SEARCH_FIXTURE_FAILED' }) }),
            ]);
            expectLateDiagnosticEvent('BAD_USER_INPUT', [apiKey, braveApiKey, ...fixture.secrets]);
          }
        });
      }
    }
  }
});
