import { PostgresqlLlmSettingRepository } from '@darun/translation-datasource';
import { LlmSettingService } from '@darun/translation-service';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres, { type Sql } from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolve } from 'node:path';

const databaseUrl = process.env['LLM_SETTING_TEST_DATABASE_URL'];
const initial = {
  endpoint: 'https://openrouter.ai/api/v1',
  apiKey: 'fixture-stored-key',
  model: 'model-a',
  thinkingLevel: 'low',
  braveApiKey: 'fixture-search-key',
};

describe.skipIf(!databaseUrl)('LLM partial settings on independent PostgreSQL connections', () => {
  let observer: Sql;
  let writers: Sql[];
  let services: LlmSettingService[];
  let writerPids: number[];

  beforeAll(async () => {
    const url = new URL(databaseUrl!);
    if (url.hostname !== '127.0.0.1' || url.pathname !== '/darun_llm_settings') {
      throw new Error('Only dedicated local darun_llm_settings is allowed');
    }
    observer = postgres(databaseUrl!, { max: 2, prepare: false });
    const [table] = await observer`select to_regclass('public.llm_settings') AS name`;
    if (table!.name && (await observer`select id from llm_settings`).length > 0) {
      await observer.end({ timeout: 5 });
      throw new Error('LLM settings fixture must start without user settings');
    }
    await migrate(drizzle(observer), {
      migrationsFolder: resolve(process.cwd(), 'scripts/migrations'),
    });
    // A fixture-only write gate pauses SQL after the service has chosen its payload.
    // It does not emulate the production read/merge/lock behavior.
    await observer.unsafe(`
      CREATE FUNCTION llm_fixture_write_gate() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        PERFORM pg_advisory_xact_lock(735, 1);
        IF NEW.model = 'fixture-write-failure' THEN
          RAISE EXCEPTION 'fixture failure with key %', NEW.api_key;
        END IF;
        RETURN NEW;
      END $$;
      CREATE TRIGGER llm_fixture_gate AFTER INSERT OR UPDATE ON llm_settings
        FOR EACH ROW EXECUTE FUNCTION llm_fixture_write_gate();
    `);
    writers = [postgres(databaseUrl!, { max: 1, prepare: false }), postgres(databaseUrl!, { max: 1, prepare: false })];
    services = writers.map(
      connection => new LlmSettingService(new PostgresqlLlmSettingRepository(drizzle(connection)))
    );
    writerPids = await Promise.all(
      writers.map(async connection => Number((await connection`select pg_backend_pid() AS pid`)[0]!.pid))
    );
  });

  afterAll(async () => {
    if (!writers) return;
    await Promise.all(writers.map(connection => connection.end({ timeout: 5 })));
    await observer.unsafe(
      'DROP TRIGGER llm_fixture_gate ON llm_settings; DROP FUNCTION llm_fixture_write_gate(); DELETE FROM llm_settings;'
    );
    await observer.end({ timeout: 5 });
  });

  beforeEach(async () => {
    await observer`delete from llm_settings`;
    vi.stubEnv('OPEN_ROUTER_API_KEY', 'fixture-environment-key');
    vi.stubEnv('OPEN_ROUTER_MODEL', 'model-a');
    vi.stubEnv('OPEN_ROUTER_THINKING_LEVEL', 'low');
    vi.stubEnv('BRAVE_API_KEY', 'fixture-search-key');
  });
  afterAll(() => vi.unstubAllEnvs());

  async function seed() {
    await observer`insert into llm_settings (id,endpoint,api_key,model,thinking_level,brave_api_key)
      values ('default',${initial.endpoint},${initial.apiKey},${initial.model},${initial.thinkingLevel},${initial.braveApiKey})`;
  }

  async function race(
    first: Parameters<LlmSettingService['updateSetting']>[0],
    second: Parameters<LlmSettingService['updateSetting']>[0]
  ) {
    const gate = await observer.reserve();
    const pending: Promise<unknown>[] = [];
    try {
      await gate`begin`;
      await gate`select pg_advisory_xact_lock(735, 1)`;
      for (const [index, input] of [first, second].entries()) {
        pending.push(services[index]!.updateSetting(input));
        // Database lock visibility is the barrier; there is no timing-based race.
        await vi.waitFor(async () => {
          const [row] = await observer`select cardinality(pg_blocking_pids(${writerPids[index]!})) AS blocked`;
          expect(Number(row!.blocked)).toBeGreaterThan(0);
        });
      }
    } finally {
      await gate`rollback`;
      gate.release();
      await Promise.all(pending);
    }
  }

  for (const existing of [true, false]) {
    for (const modelFirst of [true, false]) {
      it(`${existing ? 'existing row' : 'first creation'}: ${modelFirst ? 'model' : 'thinkingLevel'} saves first and both partial changes survive`, async () => {
        if (existing) await seed();
        const changes = [{ model: 'model-b' }, { thinkingLevel: 'high' }];
        if (!modelFirst) changes.reverse();
        await race(changes[0]!, changes[1]!);
        const rows = await observer`select * from llm_settings`;
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({
          id: 'default',
          model: 'model-b',
          thinking_level: 'high',
          brave_api_key: 'fixture-search-key',
          api_key: existing ? initial.apiKey : null,
        });
      });
    }
  }

  it('endpoint change clears the old key while a concurrent model change preserves the latest endpoint', async () => {
    await seed();
    await race({ endpoint: 'https://custom.example/v1' }, { model: 'model-b' });
    expect(await services[0]!.getSetting()).toMatchObject({
      endpoint: 'https://custom.example/v1',
      apiKey: null,
      model: 'model-b',
      braveApiKey: initial.braveApiKey,
    });
  });

  it('an explicit key deletion is not restored by another partial save', async () => {
    await seed();
    await race({ apiKey: null, braveApiKey: '' }, { thinkingLevel: 'high' });
    expect(await services[0]!.getSetting()).toMatchObject({
      apiKey: null,
      braveApiKey: null,
      model: 'model-a',
      thinkingLevel: 'high',
    });
  });

  it('key policy uses the endpoint committed by the preceding save', async () => {
    await seed();
    await expect(
      race({ endpoint: 'https://custom.example/v1' }, { apiKey: 'fixture-environment-key' })
    ).rejects.toMatchObject({ code: 'LLM_API_KEY_NOT_ALLOWED' });
    expect(await services[0]!.getSetting()).toMatchObject({ endpoint: 'https://custom.example/v1', apiKey: null });
  });

  it('the last serialized save wins for the same field', async () => {
    await seed();
    await race({ model: 'model-b' }, { model: 'model-c' });
    expect((await services[0]!.getSetting()).model).toBe('model-c');
  });

  it.each([true, false])('write failure rolls back and releases the lock (existing=%s)', async existing => {
    if (existing) await seed();
    await expect(
      services[0]!.updateSetting({
        model: 'fixture-write-failure',
        apiKey: 'fixture-error-secret',
      })
    ).rejects.toMatchObject({
      code: 'LLM_SETTING_SAVE_FAILED',
      message: 'LLM 설정을 저장하지 못했습니다.',
    });
    const rows = await observer`select * from llm_settings`;
    if (existing)
      expect(rows[0]).toMatchObject({
        model: 'model-a',
        api_key: initial.apiKey,
      });
    else expect(rows).toEqual([]);
    await services[1]!.updateSetting({ model: 'model-after-failure' });
    expect((await services[0]!.getSetting()).model).toBe('model-after-failure');
  });
});
