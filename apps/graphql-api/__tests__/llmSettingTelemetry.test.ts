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

  beforeEach(() => {
    expect(process.versions.node.split('.')[0], 'Telemetry regressions require the production Node 22 runtime').toBe(
      '22'
    );
    events = [];
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
            credentialDiagnostics: echoedCredential ? { [echoedCredential]: echoedCredential } : undefined,
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
