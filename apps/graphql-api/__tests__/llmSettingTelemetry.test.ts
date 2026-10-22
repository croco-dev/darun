import 'reflect-metadata';
import { ApolloServer } from '@apollo/server';
import type { LlmSetting, LlmSettingRepository } from '@darun/translation-domain';
import { LlmSettingService } from '@darun/translation-service';
import { createSentryApolloLogPlugin, sentryRequestRedaction } from '@darun/utils-sentry';
import * as Sentry from '@sentry/node';
import type * as GraphQL from 'graphql';
import { buildSchemaSync } from 'type-graphql';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { LlmSettingResolver } from '../../../libs/translation/feature/src/LlmSetting.resolver';

const { extendSchema, GraphQLError, parse } = createRequire(`${process.cwd()}/package.json`)(
  'graphql'
) as typeof GraphQL;

// Runtime-only values cannot appear in Sentry ContextLines source snippets.
const apiKey = `synthetic-provider-${randomUUID()}-7f4a`;
const braveApiKey = `synthetic-brave-${randomUUID()}-9d2b`;
const storedKey = `synthetic-stored-${randomUUID()}-2c8e`;
const endpoint = 'https://public-provider.example.com/v1';
const model = 'fixture/non-sensitive-model';
const selection = '{ id apiKeyMasked braveApiKeyMasked model }';
const variableQuery = `mutation SaveSettings($credential: String, $searchCredential: String, $model: String) {
  saved: updateLlmSetting(endpoint: "${endpoint}", apiKey: $credential, braveApiKey: $searchCredential, model: $model) ${selection}
}`;
const inlineQuery = `mutation SaveSettings {
  saved: updateLlmSetting(endpoint: "${endpoint}", apiKey: "${apiKey}", braveApiKey: "${braveApiKey}", model: "${model}") ${selection}
}`;
const arraySecret = `synthetic-array-${randomUUID()}`;
const objectSecret = `synthetic-object-${randomUUID()}`;
const nestedSecret = `synthetic-nested-${randomUUID()}`;
const escapedSecret = `synthetic-escaped-${randomUUID()}-"quote"-\\slash-\nline`;
const mapSecret = `synthetic-map-${randomUUID()}`;
const nestedMapSecret = `synthetic-nested-map-${randomUUID()}`;
const frameSecret = `synthetic-frame-${randomUUID()}`;
const multilineProperty = `synthetic-property-${randomUUID()}\n    at ${frameSecret} (marker)\nend`;
const escapedProperty = `synthetic-property-${randomUUID()}-"quote"-\\slash-\\nline`;
// Percent hex digits are case-insensitive in URI encodings, so property-name
// whole-key matching treats hex case as equal while real letters keep their case.
const uriProperty = `credential/${randomUUID()}a+b c`;
const uriPropertyEncodings = [encodeURI(uriProperty), encodeURIComponent(uriProperty)] as const;
const lowerPercentHex = (value: string) => value.replace(/%[\dA-Fa-f]{2}/g, octet => octet.toLowerCase());
const alternatePercentHex = (value: string) => {
  let octet = 0;
  return value.replace(/%[\dA-Fa-f]{2}/g, escape => (++octet % 2 ? escape.toLowerCase() : escape.toUpperCase()));
};
const uriPropertyHexKeys = [
  uriProperty,
  ...uriPropertyEncodings,
  ...uriPropertyEncodings.map(lowerPercentHex),
  ...uriPropertyEncodings.map(alternatePercentHex),
];
// A duplicate ObjectField keeps every occurrence in the AST; the JS object
// conversion keeps only the last one, so collection must walk the original node.
const duplicateFieldSecret = `synthetic-duplicate-${randomUUID()}`;
const nestedVariableSecret = `synthetic-nested-variable-${randomUUID()}`;
const bagValueSecret = `synthetic-bag-value-${randomUUID()}`;
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

function setting(input: Partial<LlmSetting> = {}): LlmSetting {
  return {
    id: 'default',
    endpoint,
    model,
    apiKey: storedKey,
    braveApiKey: null,
    thinkingLevel: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...input,
  };
}

describe('registered Apollo Sentry plugin and real LLM setting resolver', () => {
  let server: ApolloServer | undefined;
  let events: Sentry.Event[];
  let repository: LlmSettingRepository;
  let transportSend: Mock;
  let echoedCredential: string | undefined;
  let processorEvents: Sentry.Event[];

  beforeEach(() => {
    expect(process.versions.node.split('.')[0], 'Telemetry regressions require the production Node 22 runtime').toBe(
      '22'
    );
    events = [];
    processorEvents = [];
    echoedCredential = undefined;
    Sentry.getCurrentScope().clear();
    Sentry.getIsolationScope().clear();
    transportSend = vi.fn(async () => ({}));
    Sentry.init({
      dsn: 'https://synthetic@telemetry.invalid/1',
      defaultIntegrations: false,
      integrations: [Sentry.extraErrorDataIntegration({ depth: 5 })],
      sendClientReports: false,
      skipOpenTelemetrySetup: true,
      transport: () => ({ send: transportSend, flush: async () => true }),
      ...sentryRequestRedaction,
      // Observe the complete SDK-produced event, then stop it before transport.
      beforeSend: event => {
        processorEvents.push(event);
        events.push(sentryRequestRedaction.beforeSend(event));
        return null;
      },
    });
    vi.stubEnv('OPEN_ROUTER_API_KEY', apiKey);
    repository = {
      findSetting: vi.fn(async () => setting()),
      upsertSetting: vi.fn(async input => setting(input)),
    };
    const resolver = new LlmSettingResolver(new LlmSettingService(repository));
    const schema = extendSchema(
      buildSchemaSync({
        resolvers: [LlmSettingResolver],
        container: { get: () => resolver },
        authChecker: ({ context }) => context.admin === true,
      }),
      parse('extend type Mutation { diagnosticFailure: String }')
    );
    schema.getMutationType()!.getFields().diagnosticFailure.resolve = () => {
      throw new GraphQLError(
        `Synthetic search failure: index unavailable${echoedCredential ? ` ${echoedCredential}` : ''}`,
        {
          extensions: {
            code: 'SEARCH_FIXTURE_FAILED',
            diagnostic: 'retry index fixture',
            echoedCredential,
            credentialDiagnostics: echoedCredential
              ? { [`prefix_${echoedCredential}_suffix`]: echoedCredential }
              : undefined,
          },
        }
      );
    };
    server = new ApolloServer({ schema, plugins: [createSentryApolloLogPlugin()] });
  });

  afterEach(async () => {
    await server?.stop();
    await Sentry.close(2000);
    vi.unstubAllEnvs();
  });

  async function execute(query: string, variables?: Record<string, unknown>, admin = true) {
    if (!server) throw new Error('Apollo fixture was not initialized');
    const result = await server.executeOperation({ query, variables }, { contextValue: { admin } });
    await Sentry.flush(2000);
    expect(transportSend).not.toHaveBeenCalled();
    return result;
  }
  function expectSecretFreeEvent(path = 'saved') {
    expect(events).toHaveLength(1);
    const serialized = JSON.stringify(events[0]);
    for (const secret of [apiKey, braveApiKey, storedKey]) expect(serialized).not.toContain(secret);
    expect(events[0].tags?.kind).toBe('mutation');
    expect(events[0].extra?.query).toContain('SaveSettings');
    expect(events[0].extra?.query).toContain(endpoint);
    expect(serialized).toContain(model);
    expect(events[0].breadcrumbs).toContainEqual(expect.objectContaining({ category: 'query-path', message: path }));
  }

  for (const encoding of ['variables', 'inline'] as const) {
    for (const failure of ['policy', 'read', 'write'] as const) {
      it(`${encoding}: ${failure} remains an explicit error without credentials in the entire event`, async () => {
        if (failure !== 'policy') vi.stubEnv('OPEN_ROUTER_API_KEY', 'synthetic-other-environment-key');
        if (failure === 'read')
          vi.mocked(repository.findSetting).mockRejectedValue(new Error(`read failed ${storedKey}`));
        if (failure === 'write')
          vi.mocked(repository.upsertSetting).mockRejectedValue(
            new Error(`Failed query: insert llm_settings params ${apiKey},${braveApiKey},${storedKey}`)
          );
        const response = await execute(
          encoding === 'inline' ? inlineQuery : variableQuery,
          encoding === 'variables' ? { credential: apiKey, searchCredential: braveApiKey, model } : undefined
        );
        expect(response.body.kind).toBe('single');
        if (response.body.kind !== 'single') throw new Error('Expected single GraphQL response');
        expect(response.body.singleResult.errors).toHaveLength(1);
        expect(response.body.singleResult.data).toBeNull();
        expectSecretFreeEvent();
        const message = events[0].exception?.values?.[0].value;
        if (failure === 'policy') expect(message).toContain('OPEN_ROUTER_API_KEY');
        if (failure === 'read') expect(message).toBe('저장된 LLM 설정을 읽지 못했습니다.');
        if (failure === 'write') expect(message).toBe('LLM 설정을 저장하지 못했습니다.');
      });
    }
  }

  it('also protects an unrelated field error after a successful aliased inline setting mutation', async () => {
    vi.stubEnv('OPEN_ROUTER_API_KEY', 'synthetic-other-environment-key');
    echoedCredential = apiKey;
    const response = await execute(inlineQuery.replace(/\n}$/, '\n diagnosticFailure\n}'));
    expectSecretFreeEvent('diagnosticFailure');
    expect(events[0].exception?.values?.[0].value).toBe('Synthetic search failure: index unavailable [REDACTED]');
    expect(JSON.stringify(events[0])).toContain('SEARCH_FIXTURE_FAILED');
    if (response.body.kind !== 'single') throw new Error('Expected single GraphQL response');
    expect(response.body.singleResult.errors).toHaveLength(1);
    expect(response.body.singleResult.data?.saved).toMatchObject({ apiKeyMasked: 'synt...****7f4a', model });
  });

  it('protects secret variable defaults and an authorization failure without writing settings', async () => {
    const query = `mutation SaveSettings($credential: String = "${apiKey}", $searchCredential: String = "${braveApiKey}") {
      saved: updateLlmSetting(apiKey: $credential, braveApiKey: $searchCredential, model: "${model}", endpoint: "${endpoint}") ${selection}
    }`;
    await execute(query, undefined, false);
    expectSecretFreeEvent();
    expect(repository.findSetting).not.toHaveBeenCalled();
    expect(repository.upsertSetting).not.toHaveBeenCalled();
    expect(events[0].exception?.values?.[0].value).toContain('Access denied');
  });

  it('redacts credential substrings in valid variable names at both Apollo and final send boundaries', async () => {
    const secret = `credential_${randomUUID().replaceAll('-', '_')}`;
    const variable = `prefix_${secret}_suffix`;
    const query = `mutation SaveSettings($${variable}: String, $providerCredential: String) {
      saved: updateLlmSetting(apiKey: $${variable}, braveApiKey: $providerCredential) ${selection}
    }`;
    const response = await execute(query, { [variable]: secret, providerCredential: { type: false, id: false } });
    expect(response.http.status).toBe(400);
    expect(repository.findSetting).not.toHaveBeenCalled();
    expect(repository.upsertSetting).not.toHaveBeenCalled();
    expect(processorEvents).toHaveLength(1);
    for (const event of [...processorEvents, ...events]) {
      expect(JSON.stringify(event)).not.toContain(secret);
      expect(event.extra?.variables).toEqual({
        'prefix_[REDACTED]_suffix': '[REDACTED]',
        providerCredential: '[REDACTED]',
      });
    }
    if (response.body.kind !== 'single') throw new Error('Expected single GraphQL response');
    expect(response.body.singleResult.errors?.[0].message).toContain('String cannot represent a non string value');
  });

  it('redacts percent-hex variants of rejected property names in runtime object bag keys at the Apollo processor', async () => {
    const query = `mutation SaveSettings($credential: String, $searchCredential: String, $diagnosticBag: String, $model: String) {
      saved: updateLlmSetting(apiKey: $credential, braveApiKey: $searchCredential, model: $model, endpoint: $diagnosticBag) ${selection}
    }`;
    const response = await execute(query, {
      credential: { [uriProperty]: false },
      searchCredential: braveApiKey,
      diagnosticBag: {
        ...Object.fromEntries(uriPropertyHexKeys.map(key => [key, 'safe'])),
        providerCredential: 'safe diagnostic',
      },
      model,
    });
    expect(response.http.status).toBe(400);
    expect(repository.findSetting).not.toHaveBeenCalled();
    expect(repository.upsertSetting).not.toHaveBeenCalled();
    if (response.body.kind !== 'single') throw new Error('Expected single GraphQL response');
    // The public response keeps the original rejection and its echoed property name.
    expect(response.body.singleResult.errors?.[0].message).toContain('String cannot represent a non string value');
    expect(response.body.singleResult.errors?.[0].message).toContain(uriProperty);
    for (const event of [...processorEvents, ...events]) {
      const serialized = JSON.stringify(event);
      // No recoverable property copy survives in the input bag: raw, stored,
      // lowercase and mixed percent-hex forms all collapse into one redacted key.
      for (const key of uriPropertyHexKeys) expect(serialized).not.toContain(key);
      expect(event.extra?.variables).toEqual({
        credential: '[REDACTED]',
        searchCredential: '[REDACTED]',
        diagnosticBag: { '[REDACTED]': 'safe', providerCredential: 'safe diagnostic' },
        model,
      });
      expect(serialized).toContain('providerCredential');
      expect(event.exception?.values?.[0].value).toContain('String cannot represent a non string value');
      expect(event.exception?.values?.[0].value).not.toContain(uriProperty);
    }
  });

  for (const variable of ['credential', 'searchCredential']) {
    for (const fixture of coercionCases) {
      it(`${variable}: ${fixture.name} credentials are rejected before the resolver without leaking through scalar errors`, async () => {
        const response = await execute(variableQuery, { [variable]: fixture.value, model });
        expect(response.http.status).toBe(400);
        if (response.body.kind !== 'single') throw new Error('Expected single GraphQL response');
        expect(response.body.singleResult.data).toBeUndefined();
        expect(response.body.singleResult.errors).toEqual([
          expect.objectContaining({
            message: expect.stringContaining('String cannot represent a non string value'),
            extensions: expect.objectContaining({ code: 'BAD_USER_INPUT' }),
          }),
        ]);
        expect(repository.findSetting).not.toHaveBeenCalled();
        expect(repository.upsertSetting).not.toHaveBeenCalled();
        expect(events).toHaveLength(1);
        const event = events[0];
        const serialized = JSON.stringify(event);
        for (const echo of fixture.echoed) expect(response.body.singleResult.errors?.[0].message).toContain(echo);
        for (const secret of fixture.secrets) {
          expect(serialized).not.toContain(secret);
          expect(serialized).not.toContain(JSON.stringify(secret).slice(1, -1));
          expect(serialized).not.toContain(JSON.stringify(JSON.stringify(secret).slice(1, -1)).slice(1, -1));
        }
        expect(event.extra?.query).toContain('SaveSettings');
        expect(event.extra?.variables).toEqual({ [variable]: '[REDACTED]', model });
        expect(event.tags?.kind).toBe('mutation');
        expect(serialized).toContain('BAD_USER_INPUT');
        expect(event.event_id).toMatch(/^[a-f0-9]{32}$/);
        expect(event.timestamp).toBeGreaterThan(0);
        expect(event.exception?.values?.[0].type).toEqual(expect.stringContaining('Error'));
        expect(event.exception?.values?.[0].value).not.toMatch(/\b(?:type|id)\s*:/);
        expect(event.exception?.values?.[0].value).toContain('String cannot represent a non string value');
        expect(event.exception?.values?.[0].stacktrace?.frames?.length).toBeGreaterThan(0);
      });
    }
  }

  it('keeps non-sensitive error details when there are no setting credentials', async () => {
    await execute('mutation Diagnostics { diagnosticFailure }');
    expect(events).toHaveLength(1);
    expect(events[0].extra?.query).toContain('Diagnostics');
    expect(events[0].tags?.kind).toBe('mutation');
    expect(events[0].exception?.values?.[0].value).toBe('Synthetic search failure: index unavailable');
    expect(JSON.stringify(events[0])).toContain('SEARCH_FIXTURE_FAILED');
    expect(JSON.stringify(events[0])).toContain('retry index fixture');
    expect(events[0].exception?.values?.[0].stacktrace?.frames?.length).toBeGreaterThan(0);
    expect(events[0].breadcrumbs).toContainEqual(expect.objectContaining({ message: 'diagnosticFailure' }));
  });
});

describe('direct common send hook fixtures (not incoming HTTP)', () => {
  for (const hook of ['beforeSend', 'beforeSendTransaction'] as const) {
    for (const argument of ['apiKey', 'braveApiKey']) {
      for (const actualSecret of [false, true]) {
        it(`${hook}: URL search and fragment removal preserves ${argument} ${actualSecret ? 'redacted secret paths' : 'diagnostic paths'}`, () => {
          const property = `url-property-${randomUUID()}-"quote"-\\slash-+/= space`;
          const secret = `url-value-${randomUUID()}-"quote"-\\slash-+/= space`;
          const credential = {
            POST: false,
            graphql: false,
            [property]: false,
            ...(actualSecret ? { token: secret } : {}),
          };
          const variables = JSON.stringify({ credential });
          const trace = {
            trace_id: randomUUID().replaceAll('-', ''),
            span_id: randomUUID().replaceAll('-', '').slice(0, 16),
          };
          for (const suffix of [
            `?${new URLSearchParams({ variables })}`,
            `?${new URLSearchParams({ diagnostic: property })}#${encodeURIComponent(property)}`,
            `#${encodeURIComponent(property)}`,
          ]) {
            const data = {
              'http.method': 'POST',
              'http.target': `/graphql${actualSecret ? `/${encodeURIComponent(secret)}` : ''}${suffix}`,
              'http.url': `https://fixture.invalid/graphql${actualSecret ? `/${encodeURI(secret)}` : ''}${suffix}`,
              'http.route': actualSecret ? `/graphql/${JSON.stringify(secret).slice(1, -1)}` : '/graphql',
            };
            const request = {
              method: 'POST',
              url: `https://fixture.invalid/graphql${suffix}`,
              query_string: suffix,
              data: {
                query: `mutation Rejected($credential: String) { updateLlmSetting(${argument}: $credential) { id } }`,
                variables: { credential },
              },
              headers: { 'x-safe': 'diagnostic' },
            };
            const event: Sentry.Event = {
              event_id: randomUUID().replaceAll('-', ''),
              ...(hook === 'beforeSendTransaction' ? { type: 'transaction' as const } : {}),
              contexts: { trace: { ...trace, data } },
              spans: [
                {
                  ...trace,
                  start_timestamp: 1,
                  timestamp: 2,
                  data: { ...data, 'http.target': `/graphql${actualSecret ? `/${secret}` : ''}${suffix}` },
                },
              ],
              request,
              sdkProcessingMetadata: { normalizedRequest: JSON.parse(JSON.stringify(request)) },
            };
            const original = JSON.stringify(event);
            const result = sentryRequestRedaction[hook](event);
            for (const attributes of [result.contexts?.trace?.data, result.spans?.[0].data]) {
              expect(attributes).toEqual({
                'http.method': 'POST',
                'http.target': actualSecret ? '/graphql/[REDACTED]' : '/graphql',
                'http.url': actualSecret
                  ? 'https://fixture.invalid/graphql/[REDACTED]'
                  : 'https://fixture.invalid/graphql',
                'http.route': actualSecret ? '/graphql/[REDACTED]' : '/graphql',
              });
            }
            for (const copy of [result.request, result.sdkProcessingMetadata?.normalizedRequest]) {
              expect(copy).toEqual({
                method: 'POST',
                url: 'https://fixture.invalid/graphql',
                headers: { 'x-safe': 'diagnostic' },
              });
            }
            expect(result.event_id).toBe(event.event_id);
            expect(result.type).toBe(event.type);
            expect(result.contexts?.trace).toMatchObject(trace);
            expect(result.spans?.[0]).toMatchObject(trace);
            expect(JSON.stringify(event)).toBe(original);
          }
        });
      }

      for (const actualSecret of [false, true]) {
        it(`${hook}: fixed HTTP attributes distinguish ${argument} ${actualSecret ? 'secret values' : 'property names'} from input`, () => {
          const secret = `http-value-${randomUUID()}-"quote"-\\slash-+/= space`;
          const property = `http-property-${randomUUID()}`;
          const transaction = `fixture POST /graphql ${property}`;
          const data = {
            'http.method': actualSecret ? secret : 'POST',
            'http.target': actualSecret ? `/${encodeURIComponent(secret)}` : '/graphql?query=private',
            'http.url': actualSecret
              ? `https://fixture.invalid/${encodeURI(secret)}`
              : 'https://fixture.invalid/graphql?query=private',
            'http.route': actualSecret ? `/${JSON.stringify(secret).slice(1, -1)}` : '/graphql',
            'http.request.header.x_fixture_collision': 'POST /graphql',
            'http.request.header.x_transaction_id': transaction,
            'http.request.header.cookie.graphql': 'POST',
            'http.request.header.set_cookie.post': 'graphql',
            'fixture.input': { 'http.method': 'POST', graphql: 'POST', type: 'graphql' },
          };
          const request = {
            method: 'POST',
            url: 'https://fixture.invalid/graphql?query=private#fragment',
            data: {
              query: `mutation Rejected($credential: String) { updateLlmSetting(${argument}: $credential) { id } }`,
              variables: {
                credential: {
                  POST: false,
                  graphql: false,
                  [property]: false,
                  ...(actualSecret ? { token: secret } : {}),
                },
              },
            },
            headers: {
              'x-transaction-id': transaction,
              'x-fixture-collision': 'POST /graphql',
              'x-safe': 'diagnostic',
            },
            cookies: { graphql: 'POST', POST: 'graphql', flavor: 'vanilla' },
          };
          const trace = {
            trace_id: randomUUID().replaceAll('-', ''),
            span_id: randomUUID().replaceAll('-', '').slice(0, 16),
            parent_span_id: randomUUID().replaceAll('-', '').slice(0, 16),
          };
          const frame = {
            filename: '/fixture/graphql/scalars.js',
            context_line: 'const method = "POST";',
            pre_context: ['// graphql source'],
            post_context: ['return method;'],
          };
          const event: Sentry.Event = {
            event_id: randomUUID().replaceAll('-', ''),
            ...(hook === 'beforeSendTransaction' ? { type: 'transaction' as const } : {}),
            transaction,
            contexts: { trace: { ...trace, data } },
            spans: [{ ...trace, start_timestamp: 1, timestamp: 2, data }],
            message: 'POST /graphql',
            exception: { values: [{ type: 'FixtureError', value: 'POST /graphql', stacktrace: { frames: [frame] } }] },
            extra: { input: { graphql: 'POST' } },
            request,
            sdkProcessingMetadata: { normalizedRequest: JSON.parse(JSON.stringify(request)) },
          };
          const original = JSON.stringify(event);
          const result = sentryRequestRedaction[hook](event);
          for (const attributes of [result.contexts?.trace?.data, result.spans?.[0].data]) {
            expect(attributes).toEqual({
              'http.method': actualSecret ? '[REDACTED]' : 'POST',
              'http.target': actualSecret ? '/[REDACTED]' : '/graphql',
              'http.url': actualSecret ? 'https://fixture.invalid/[REDACTED]' : 'https://fixture.invalid/graphql',
              'http.route': actualSecret ? '/[REDACTED]' : '/graphql',
              'http.request.header.x_fixture_collision': '[REDACTED] /[REDACTED]',
              'http.request.header.x_transaction_id': 'fixture [REDACTED] /[REDACTED] [REDACTED]',
              'http.request.header.cookie.[REDACTED]': '[REDACTED]',
              'http.request.header.set_cookie.[REDACTED]': '[REDACTED]',
              'fixture.input': { 'http.method': '[REDACTED]', '[REDACTED]': '[REDACTED]', type: '[REDACTED]' },
            });
          }
          for (const copy of [result.request, result.sdkProcessingMetadata?.normalizedRequest]) {
            expect(copy).toEqual({
              method: 'POST',
              url: 'https://fixture.invalid/graphql',
              headers: {
                'x-transaction-id': 'fixture [REDACTED] /[REDACTED] [REDACTED]',
                'x-fixture-collision': '[REDACTED] /[REDACTED]',
                'x-safe': 'diagnostic',
              },
              cookies: { '[REDACTED]': '[REDACTED]', flavor: 'vanilla' },
            });
          }
          expect(result.transaction).toBe('fixture [REDACTED] /[REDACTED] [REDACTED]');
          expect(result.message).toBe('[REDACTED] /[REDACTED]');
          expect(result.extra).toEqual({ input: { '[REDACTED]': '[REDACTED]' } });
          expect(result.exception?.values?.[0]).toEqual({
            type: 'FixtureError',
            value: '[REDACTED] /[REDACTED]',
            stacktrace: { frames: [frame] },
          });
          expect(result.event_id).toBe(event.event_id);
          expect(result.type).toBe(event.type);
          expect(result.contexts?.trace).toMatchObject(trace);
          expect(result.spans?.[0]).toMatchObject(trace);
          for (const credential of [property, ...(actualSecret ? [secret] : [])]) {
            for (const copy of [
              credential,
              JSON.stringify(credential).slice(1, -1),
              encodeURI(credential),
              encodeURIComponent(credential),
            ]) {
              expect(JSON.stringify(result)).not.toContain(JSON.stringify(copy).slice(1, -1));
            }
          }
          expect(JSON.stringify(event)).toBe(original);
        });
      }
    }
    for (const argument of ['apiKey', 'braveApiKey']) {
      it(`${hook}: header-derived transaction protects ${argument} property names without changing protocol or source`, () => {
        const property = `header-property-${randomUUID()}-"quote"-\\slash-+/= space`;
        // A real secret value embedded in a route-shaped transaction name.
        const secretRouteSuffix = `route-secret-${randomUUID()}`;
        const copies = [
          property,
          JSON.stringify(property).slice(1, -1),
          encodeURI(property),
          encodeURIComponent(property),
          new URLSearchParams({ value: property }).toString().slice('value='.length),
        ];
        const transaction = `fixture transaction ${copies.join(' | ')}`;
        const trace = {
          trace_id: randomUUID().replaceAll('-', ''),
          span_id: randomUUID().replaceAll('-', '').slice(0, 16),
          parent_span_id: randomUUID().replaceAll('-', '').slice(0, 16),
        };
        const frame = {
          filename: '/fixture/graphql/type/scalars.js',
          context_line: 'const type = input.type;',
          pre_context: ['// type diagnostic'],
          post_context: ['return type;'],
        };
        const request = {
          method: 'POST',
          url: 'https://fixture.invalid/graphql?query=private#fragment',
          data: [
            { query: 'mutation Diagnostics { diagnosticFailure }' },
            {
              query: `mutation Rejected($credential: String) { updateLlmSetting(${argument}: $credential) { id } }`,
              // token doubles as the real secret embedded in the route-shaped name below.
              variables: {
                credential: {
                  [property]: false,
                  type: true,
                  POST: false,
                  graphql: false,
                  token: secretRouteSuffix,
                },
              },
            },
          ],
          headers: { 'x-transaction-id': transaction, 'x-safe': 'diagnostic' },
        };
        const event: Sentry.Event = {
          event_id: randomUUID().replaceAll('-', ''),
          ...(hook === 'beforeSendTransaction' ? { type: 'transaction' as const } : {}),
          transaction,
          contexts: { trace, runtime: { name: 'type diagnostic', version: '22' } },
          spans: [{ ...trace, start_timestamp: 1, timestamp: 2, description: 'POST /graphql' }],
          exception: { values: [{ type: 'FixtureError', value: 'diagnostic', stacktrace: { frames: [frame] } }] },
          request,
          sdkProcessingMetadata: { normalizedRequest: JSON.parse(JSON.stringify(request)) },
        };
        const original = JSON.stringify(event);
        const result = sentryRequestRedaction[hook](event);
        expect(result.transaction).toBe(`fixture transaction ${copies.map(() => '[REDACTED]').join(' | ')}`);
        for (const copy of copies) expect(JSON.stringify(result)).not.toContain(JSON.stringify(copy).slice(1, -1));
        for (const copy of [result.request, result.sdkProcessingMetadata?.normalizedRequest]) {
          expect(copy).toEqual({
            method: 'POST',
            url: 'https://fixture.invalid/graphql',
            headers: { 'x-transaction-id': result.transaction, 'x-safe': 'diagnostic' },
          });
        }
        expect(result.event_id).toBe(event.event_id);
        expect(result.type).toBe(event.type);
        expect(result.contexts).toEqual(event.contexts);
        expect(result.spans).toEqual(event.spans);
        expect(result.exception).toEqual(event.exception);
        expect(JSON.stringify(event)).toBe(original);
        const safe = { ...event, transaction: 'fixture transaction diagnostic' };
        expect(sentryRequestRedaction[hook](safe).transaction).toBe(safe.transaction);
        expect(sentryRequestRedaction[hook]({ ...event, request: undefined }).transaction).toBe(result.transaction);
        const route = { ...event, type: 'transaction' as const, transaction: 'POST /graphql' };
        expect(sentryRequestRedaction[hook](route).transaction).toBe(route.transaction);
        // The SDK derives the real incoming transaction name from the request
        // line, never from this header, so an exact string match is still the
        // route diagnostic and must survive input redaction on the protocol path.
        const collision = {
          ...event,
          type: 'transaction' as const,
          transaction: 'POST /graphql',
          contexts: {
            ...event.contexts,
            trace: { ...trace, op: 'http.server' },
          },
          request: {
            ...request,
            headers: {
              ...request.headers,
              'x-transaction-id': 'POST /graphql',
            },
          },
          sdkProcessingMetadata: {
            normalizedRequest: {
              ...request,
              headers: {
                ...request.headers,
                'x-transaction-id': 'POST /graphql',
              },
            },
          },
        };
        expect(sentryRequestRedaction[hook](collision).transaction).toBe('POST /graphql');
        // Actual secret values inside a route-shaped name on the same protocol
        // path are still removed, even though the name differs from the header.
        const secretRoute = {
          ...collision,
          transaction: `POST /graphql ${secretRouteSuffix}`,
        };
        expect(sentryRequestRedaction[hook](secretRoute).transaction).toBe('POST /graphql [REDACTED]');
        // An event with no http.server trace op keeps the existing header-copy
        // policy: identical strings still redact as input.
        const headerOnly = {
          ...event,
          transaction: 'POST /graphql',
          request: {
            ...request,
            headers: {
              ...request.headers,
              'x-transaction-id': 'POST /graphql',
            },
          },
          sdkProcessingMetadata: {
            normalizedRequest: {
              ...request,
              headers: {
                ...request.headers,
                'x-transaction-id': 'POST /graphql',
              },
            },
          },
        };
        expect(sentryRequestRedaction[hook](headerOnly).transaction).toBe('[REDACTED] /[REDACTED]');
        if (hook === 'beforeSend') {
          // A prior operation may already have removed another part of the name.
          const partial = { ...event, transaction: `fixture transaction [REDACTED] | ${property}` };
          expect(sentryRequestRedaction[hook](partial).transaction).toBe('fixture transaction [REDACTED] | [REDACTED]');
        }
      });
    }
    it(`${hook}: normalized SDK cookie suffixes are protected only at trace and span cookie attributes`, () => {
      const secret = `Probe-Mixed-${randomUUID()}-AbC`;
      const normalized = `probe_mixed_${secret.slice('Probe-Mixed-'.length).replaceAll('-', '_').toLowerCase()}`;
      const caseVariant = secret.toLowerCase();
      const property = 'CredentialToken';
      const trace = {
        trace_id: randomUUID().replaceAll('-', ''),
        span_id: randomUUID().replaceAll('-', '').slice(0, 16),
      };
      const data = {
        [`http.request.header.cookie.prefix_${normalized}_suffix`]: 'cookie diagnostic',
        [`http.request.header.set_cookie.${normalized}`]: 'set-cookie diagnostic',
        'http.request.header.cookie.fixture_flavor': 'vanilla',
        'http.request.header.set_cookie.fixture_theme': 'light',
        // The SDK representation rule must not spread to general keys or values.
        [`fixture.${normalized}`]: normalized,
        'fixture.case-sensitive': caseVariant,
      };
      const request = {
        method: 'POST',
        url: 'https://fixture.invalid/graphql',
        data: {
          query:
            'mutation CookieProbe($credential: String, $search: String) { updateLlmSetting(apiKey: $credential, braveApiKey: $search) { id } }',
          variables: { credential: secret, search: { [property]: false } },
        },
        headers: { cookie: `${secret}=safe`, 'x-safe': 'diagnostic', 'x-case-variant': caseVariant },
        cookies: { [secret]: 'safe', fixture_flavor: 'vanilla' },
      };
      const frame = {
        filename: '/fixture/scalars.js',
        context_line: 'function parseValue(input) {',
        pre_context: ['// source'],
        post_context: ['return input;'],
      };
      const event: Sentry.Event = {
        event_id: randomUUID().replaceAll('-', ''),
        ...(hook === 'beforeSendTransaction' ? { type: 'transaction' as const } : {}),
        contexts: { trace: { ...trace, data } },
        spans: [{ ...trace, start_timestamp: 1, timestamp: 2, data }],
        exception: { values: [{ type: 'FixtureError', value: secret, stacktrace: { frames: [frame] } }] },
        extra: {
          [property]: 'private',
          prefixCredentialToken: 'safe',
          credentialtoken: 'case distinct',
          caseVariant,
        },
        request,
        sdkProcessingMetadata: { normalizedRequest: JSON.parse(JSON.stringify(request)) },
      };
      const original = JSON.stringify(event);
      const result = sentryRequestRedaction[hook](event);
      for (const attributes of [result.contexts?.trace?.data, result.spans?.[0].data]) {
        expect(attributes).toEqual({
          'http.request.header.cookie.prefix_[REDACTED]_suffix': 'cookie diagnostic',
          'http.request.header.set_cookie.[REDACTED]': 'set-cookie diagnostic',
          'http.request.header.cookie.fixture_flavor': 'vanilla',
          'http.request.header.set_cookie.fixture_theme': 'light',
          [`fixture.${normalized}`]: normalized,
          'fixture.case-sensitive': caseVariant,
        });
      }
      // Normalized forms deliberately survive outside cookie attribute suffixes;
      // check their absence within that boundary, and raw/JSON/URI copies globally.
      for (const copy of [secret, JSON.stringify(secret).slice(1, -1), encodeURI(secret), encodeURIComponent(secret)]) {
        expect(JSON.stringify(result)).not.toContain(copy);
      }
      for (const copy of [result.request, result.sdkProcessingMetadata?.normalizedRequest]) {
        expect(copy.headers).toEqual({
          cookie: '[REDACTED]=safe',
          'x-safe': 'diagnostic',
          'x-case-variant': caseVariant,
        });
        expect(copy.cookies).toEqual({ '[REDACTED]': 'safe', fixture_flavor: 'vanilla' });
        expect(copy.data).toBeUndefined();
      }
      expect(result.extra).toEqual({
        '[REDACTED]': 'private',
        prefixCredentialToken: 'safe',
        credentialtoken: 'case distinct',
        caseVariant,
      });
      expect(result.event_id).toBe(event.event_id);
      expect(result.type).toBe(event.type);
      expect(result.contexts?.trace).toMatchObject(trace);
      expect(result.spans?.[0]).toMatchObject(trace);
      expect(result.exception?.values?.[0]).toEqual({
        type: 'FixtureError',
        value: '[REDACTED]',
        stacktrace: { frames: [frame] },
      });
      expect(JSON.stringify(event)).toBe(original);
    });
    for (const encoding of ['inline', 'defaults']) {
      it(`${hook}: rejected ${encoding} objects and arrays protect both request copies without changing the event`, () => {
        const property = `credential_${randomUUID().replaceAll('-', '_')}`;
        const literal = `{ ${property}: { type: ${JSON.stringify(escapedSecret)}, id: [${JSON.stringify(apiKey)}] } }`;
        const query =
          encoding === 'inline'
            ? `mutation Rejected { updateLlmSetting(apiKey: ${literal}, braveApiKey: [${literal}]) ${selection} }`
            : `mutation Rejected($providerCredential: String = ${literal}, $searchCredential: String = [${literal}]) { updateLlmSetting(apiKey: $providerCredential, braveApiKey: $searchCredential) ${selection} }`;
        const request = {
          method: 'POST',
          url: 'https://fixture.invalid/graphql',
          data: { query },
          headers: {
            type: escapedSecret,
            event_id: encodeURIComponent(escapedSecret),
            'x-property-echo': property,
            'x-safe': 'safe diagnostic',
          },
          cookies: { [property]: escapedSecret, [encodeURIComponent(escapedSecret)]: property },
        };
        const event: Sentry.Event = {
          event_id: randomUUID().replaceAll('-', ''),
          ...(hook === 'beforeSendTransaction' ? { type: 'transaction' as const } : {}),
          extra: { [`prefix_${apiKey}_suffix`]: { [property]: escapedSecret } },
          request,
          sdkProcessingMetadata: { normalizedRequest: JSON.parse(JSON.stringify(request)) },
        };
        const original = JSON.stringify(event);
        const result = sentryRequestRedaction[hook](event);
        for (const secret of [escapedSecret, apiKey, property]) {
          for (const copy of [
            secret,
            JSON.stringify(secret).slice(1, -1),
            encodeURI(secret),
            encodeURIComponent(secret),
          ]) {
            expect(JSON.stringify(result)).not.toContain(copy);
          }
        }
        expect(result.event_id).toBe(event.event_id);
        expect(result.type).toBe(event.type);
        for (const copy of [result.request, result.sdkProcessingMetadata?.normalizedRequest]) {
          expect(copy.headers).toEqual({
            type: '[REDACTED]',
            event_id: '[REDACTED]',
            'x-property-echo': '[REDACTED]',
            'x-safe': 'safe diagnostic',
          });
          expect(copy.cookies).toEqual({ '[REDACTED]': '[REDACTED]' });
          expect(copy.data).toBeUndefined();
        }
        expect(JSON.stringify(event)).toBe(original);
      });
    }
    for (const encoding of ['inline', 'defaults']) {
      it(`${hook}: rejected ${encoding} duplicate fields, nested variables and percent-hex bag keys are redacted without changing the event`, () => {
        const duplicateField = `{ token: "${duplicateFieldSecret}", token: false, nested: { inner: $inlineVariable } }`;
        const query =
          encoding === 'inline'
            ? `mutation Rejected($diagnosticBag: String) { updateLlmSetting(apiKey: $diagnosticBag, braveApiKey: [${duplicateField}]) ${selection} }`
            : `mutation Rejected($inlineVariable: String = "${nestedVariableSecret}", $diagnosticBag: String) { updateLlmSetting(apiKey: $diagnosticBag, braveApiKey: [${duplicateField}]) ${selection} }`;
        const operation = {
          query,
          variables: {
            ...(encoding === 'inline' ? { inlineVariable: nestedVariableSecret } : {}),
            diagnosticBag: Object.fromEntries(uriPropertyHexKeys.map(key => [key, bagValueSecret])),
          },
        };
        const request = {
          method: 'POST',
          url: 'https://fixture.invalid/graphql',
          data: operation,
          headers: {
            type: duplicateFieldSecret,
            event_id: encodeURIComponent(nestedVariableSecret),
            'x-property-echo': uriProperty,
            'x-property-lower': encodeURIComponent(uriProperty).replace(/%[\dA-Fa-f]{2}/g, octet =>
              octet.toLowerCase()
            ),
            'x-safe': 'safe diagnostic',
          },
          cookies: {
            [uriProperty]: escapedSecret,
            [encodeURIComponent(uriProperty).replace(/%[\dA-Fa-f]{2}/g, octet => octet.toLowerCase())]: uriProperty,
          },
        };
        const event: Sentry.Event = {
          event_id: randomUUID().replaceAll('-', ''),
          ...(hook === 'beforeSendTransaction' ? { type: 'transaction' as const } : {}),
          extra: {
            ...Object.fromEntries(uriPropertyHexKeys.map(key => [key, bagValueSecret])),
            providerCredential: 'safe diagnostic',
            diagnostic: { [uriProperty]: duplicateFieldSecret, deep: { inner: nestedVariableSecret } },
          },
          request,
          sdkProcessingMetadata: { normalizedRequest: JSON.parse(JSON.stringify(request)) },
        };
        const original = JSON.stringify(event);
        const result = sentryRequestRedaction[hook](event);
        const serialized = JSON.stringify(result);
        for (const secret of [duplicateFieldSecret, nestedVariableSecret, uriProperty, escapedSecret]) {
          for (const copy of [
            secret,
            JSON.stringify(secret).slice(1, -1),
            encodeURI(secret),
            encodeURIComponent(secret),
          ]) {
            expect(serialized).not.toContain(copy);
          }
        }
        for (const key of uriPropertyHexKeys) expect(serialized).not.toContain(key);
        expect(result.event_id).toBe(event.event_id);
        expect(result.type).toBe(event.type);
        // All percent-hex variants of the rejected property name collapse into
        // one redacted bag key while unrelated key vocabulary stays intact.
        expect(result.extra).toEqual({
          '[REDACTED]': '[REDACTED]',
          providerCredential: 'safe diagnostic',
          diagnostic: expect.any(Object),
        });
        expect(result.extra?.diagnostic).toEqual({ '[REDACTED]': '[REDACTED]', deep: { '[REDACTED]': '[REDACTED]' } });
        for (const copy of [result.request, result.sdkProcessingMetadata?.normalizedRequest]) {
          expect(copy.headers).toEqual({
            type: '[REDACTED]',
            event_id: '[REDACTED]',
            'x-property-echo': '[REDACTED]',
            'x-property-lower': '[REDACTED]',
            'x-safe': 'safe diagnostic',
          });
          expect(copy.cookies).toEqual({ '[REDACTED]': '[REDACTED]' });
          expect(copy.data).toBeUndefined();
        }
        expect(JSON.stringify(event)).toBe(original);
      });
    }
    it(`${hook}: 두 request 사본의 header 값·cookie 이름/값과 중첩 입력은 정제하고 protocol identity는 보존한다`, () => {
      const trace = {
        trace_id: randomUUID().replaceAll('-', ''),
        span_id: randomUUID().replaceAll('-', '').slice(0, 16),
        parent_span_id: randomUUID().replaceAll('-', '').slice(0, 16),
      };
      const inputCopies = {
        type: apiKey,
        event_id: braveApiKey,
        trace_id: escapedSecret,
        span_id: encodeURIComponent(apiKey),
        parent_span_id: JSON.stringify(escapedSecret).slice(1, -1),
        'x-fixture-diagnostic': 'safe diagnostic',
      };
      const inputBag = {
        ...inputCopies,
        [`prefix_${apiKey}_suffix`]: 'safe',
        [`prefix_${JSON.stringify(escapedSecret).slice(1, -1)}_suffix`]: 'safe',
        [`prefix_${encodeURIComponent(escapedSecret)}_suffix`]: 'safe',
        providerCredential: 'safe diagnostic',
      };
      const operation = {
        query: variableQuery,
        variables: {
          credential: { type: escapedSecret, id: apiKey, name: false, version: false, [mapSecret]: false },
          searchCredential: braveApiKey,
        },
      };
      const request = {
        method: 'POST',
        url: 'https://fixture.invalid/graphql?query=removed#removed',
        data: operation,
        query_string: 'query=removed',
        headers: { ...inputCopies, 'x-property-echo': mapSecret },
        cookies: { ...inputCopies, [mapSecret]: escapedSecret, [encodeURIComponent(apiKey)]: braveApiKey },
      };
      const frame = {
        filename: '/fixture/graphql/type/scalars.js',
        function: 'parseValue',
        context_line: 'function parseValue(inputValue, type) {',
        pre_context: ['// preserve source type and id vocabulary'],
        post_context: ['return inputValue;'],
      };
      const event: Sentry.Event = {
        event_id: randomUUID().replaceAll('-', ''),
        ...(hook === 'beforeSendTransaction' ? { type: 'transaction' as const } : {}),
        contexts: {
          trace,
          FixtureError: { nested: inputBag, message: mapSecret },
          runtime: { name: 'node', version: '22.23.3' },
        },
        spans: [{ ...trace, start_timestamp: 1, timestamp: 2, data: { nested: inputCopies } }],
        exception: { values: [{ type: 'FixtureError', value: mapSecret, stacktrace: { frames: [frame] } }] },
        extra: { nested: { ...inputBag, [mapSecret]: false }, callSite: mapSecret },
        breadcrumbs: [{ category: 'fixture', message: mapSecret, data: { ...inputBag, [mapSecret]: false } }],
        request,
        sdkProcessingMetadata: { normalizedRequest: JSON.parse(JSON.stringify(request)) },
      };
      const original = JSON.stringify(event);
      const result = sentryRequestRedaction[hook](event);

      // An independent absence oracle covers values and object keys, including
      // JSON-escaped and URI copies, without borrowing production patterns.
      const serialized = JSON.stringify(result);
      for (const secret of [apiKey, braveApiKey, escapedSecret, mapSecret]) {
        for (const copy of [
          secret,
          JSON.stringify(secret).slice(1, -1),
          JSON.stringify(JSON.stringify(secret).slice(1, -1)).slice(1, -1),
          encodeURI(secret),
          encodeURIComponent(secret),
        ]) {
          expect(serialized).not.toContain(copy);
        }
      }
      expect(result.event_id).toBe(event.event_id);
      expect(result.type).toBe(event.type);
      expect(result.contexts?.trace).toEqual(trace);
      expect(result.spans?.[0]).toMatchObject(trace);
      expect(result.exception?.values?.[0]).toMatchObject({ type: 'FixtureError', value: '[REDACTED]' });
      expect(result.exception?.values?.[0].stacktrace?.frames).toEqual([frame]);
      expect(result.contexts?.runtime).toEqual({ name: 'node', version: '22.23.3' });
      for (const bag of [result.extra?.nested, result.contexts?.FixtureError?.nested, result.breadcrumbs?.[0].data]) {
        expect(bag).toMatchObject({ providerCredential: 'safe diagnostic' });
      }
      for (const copy of [result.request, result.sdkProcessingMetadata?.normalizedRequest]) {
        expect(copy).toMatchObject({ method: 'POST', url: 'https://fixture.invalid/graphql' });
        expect(copy.headers).toMatchObject({
          type: '[REDACTED]',
          event_id: '[REDACTED]',
          trace_id: '[REDACTED]',
          span_id: '[REDACTED]',
          parent_span_id: '[REDACTED]',
          'x-property-echo': '[REDACTED]',
          'x-fixture-diagnostic': 'safe diagnostic',
        });
        expect(copy.cookies).toMatchObject({ '[REDACTED]': '[REDACTED]' });
        expect(copy.data).toBeUndefined();
        expect(copy.query_string).toBeUndefined();
      }
      expect(JSON.stringify(event)).toBe(original);
    });
  }
});
