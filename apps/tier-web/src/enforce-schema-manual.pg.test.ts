import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const databaseUrl = process.env.SCHEMA_RECOVERY_TEST_DATABASE_URL;
const execute = promisify(execFile);
const appDirectory = fileURLToPath(new URL('../', import.meta.url));
const appId = '00000000-0000-0000-0000-000000000740';

if (databaseUrl) {
  const url = new URL(databaseUrl);
  if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname !== '/darun_schema_recovery') {
    throw new Error('Schema recovery tests require the dedicated local darun_schema_recovery database');
  }
}

describe.skipIf(!databaseUrl)('manual schema recovery CLI with isolated PostgreSQL', () => {
  const sql = postgres(databaseUrl!, { max: 1, onnotice: () => {} });
  let ownsFixtureTables = false;

  async function run() {
    return execute(process.execPath, ['scripts/enforce-schema-manual.ts'], {
      cwd: appDirectory,
      env: {
        NODE_ENV: 'test',
        PATH: process.env.PATH,
        DATABASE_URL: databaseUrl,
      },
      timeout: 15000,
    });
  }

  async function snapshot() {
    return {
      apps: await sql`select * from public.apps order by id`,
      memos: await sql`select * from public.memos order by id`,
      constraints: await sql`select oid, conname, pg_get_constraintdef(oid) as definition
        from pg_constraint where conrelid in ('public.apps'::regclass, 'public.memos'::regclass)
        order by oid`,
    };
  }

  beforeAll(async () => {
    const [existing] = await sql`select count(*)::integer as count from information_schema.tables
      where table_schema = 'public'`;
    if (existing.count !== 0) throw new Error('Schema recovery tests require an empty dedicated database');
    ownsFixtureTables = true;
  });

  beforeEach(async () => {
    await sql`drop table if exists public.memos, public.tiers, public.apps, public.users cascade`;
    for (const file of [
      '0000_careless_leech.sql',
      '0001_orange_queen_noir.sql',
      '0002_atomic_tiers.sql',
      '0003_atomic_memos.sql',
    ]) {
      await sql.unsafe(await readFile(new URL(`../drizzle/${file}`, import.meta.url), 'utf8'));
    }
    await sql`insert into public.apps (id, app_store_id, name) values (${appId}, 'id740', 'Recovery app')`;
    await sql`insert into public.memos (app_id, content) values (${appId}, 'Preserved memo')`;
  });

  afterAll(async () => {
    try {
      if (ownsFixtureTables)
        await sql`drop table if exists public.memos, public.tiers, public.apps, public.users cascade`;
    } finally {
      await sql.end();
    }
  });

  it('없는 메모 테이블을 CASCADE 외래 키로 복구하고 고아 행을 거절한다', async () => {
    await sql`drop table public.memos`;
    await run();
    await sql`insert into public.memos (app_id, content) values (${appId}, 'New memo')`;
    await expect(sql`insert into public.memos (app_id, content) values (${appId}, 'Duplicate')`).rejects.toMatchObject({
      code: '23505',
    });
    await sql`delete from public.apps where id = ${appId}`;
    expect(await sql`select * from public.memos`).toHaveLength(0);
    await expect(sql`insert into public.memos (app_id, content) values (${appId}, 'Orphan')`).rejects.toMatchObject({
      code: '23503',
    });
  });

  it('기존 메모 테이블의 누락된 외래 키를 자료 보존과 함께 복구한다', async () => {
    await sql`alter table public.memos drop constraint memos_app_id_apps_id_fk`;
    const before = await snapshot();
    await run();
    expect((await snapshot()).memos).toEqual(before.memos);
    await expect(
      sql`insert into public.memos (app_id, content) values (gen_random_uuid(), 'Orphan')`
    ).rejects.toMatchObject({
      code: '23503',
    });
    await sql`delete from public.apps where id = ${appId}`;
    expect(await sql`select * from public.memos`).toHaveLength(0);
  });

  it('누락된 메모 unique를 복구하고 중복 삽입을 거절한다', async () => {
    await sql`alter table public.memos drop constraint memos_app_id_unique`;
    const before = await snapshot();
    await run();
    expect((await snapshot()).memos).toEqual(before.memos);
    await expect(sql`insert into public.memos (app_id, content) values (${appId}, 'Duplicate')`).rejects.toMatchObject({
      code: '23505',
    });
  });

  it('기존 중복 메모를 자동 삭제하지 않고 복구를 거절한다', async () => {
    await sql`alter table public.memos drop constraint memos_app_id_unique`;
    await sql`insert into public.memos (app_id, content) values (${appId}, 'Keep another memo')`;
    const before = await snapshot();
    await expect(run()).rejects.toMatchObject({ code: 1, stderr: expect.stringContaining('duplicate app_id') });
    expect(await snapshot()).toEqual(before);
  });

  it('다른 컬럼의 동명 메모 unique를 정상으로 인정하지 않는다', async () => {
    await sql`alter table public.memos drop constraint memos_app_id_unique`;
    await sql`alter table public.memos add constraint memos_app_id_unique unique (content)`;
    const before = await snapshot();
    await expect(run()).rejects.toMatchObject({ code: 1 });
    expect(await snapshot()).toEqual(before);
  });

  it('정상 스키마를 반복 실행해도 행과 제약의 identity를 바꾸지 않는다', async () => {
    const before = await snapshot();
    await run();
    await run();
    expect(await snapshot()).toEqual(before);
  });

  it.each(['no action', 'set null'])('기존 %s 삭제 규칙은 자료를 보존하고 명시적으로 거절한다', async rule => {
    await sql`alter table public.memos drop constraint memos_app_id_apps_id_fk`;
    await sql.unsafe(`alter table public.memos add constraint memos_app_id_apps_id_fk
      foreign key (app_id) references public.apps(id) on delete ${rule}`);
    const before = await snapshot();
    await expect(run()).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining('memos'),
    });
    expect(await snapshot()).toEqual(before);
  });

  it('이름만 같은 다른 테이블 대상의 외래 키를 정상으로 인정하지 않는다', async () => {
    await sql`alter table public.memos drop constraint memos_app_id_apps_id_fk`;
    await sql`insert into public.users (id, email) values (${appId}, 'other@example.invalid')`;
    await sql`alter table public.memos add constraint memos_app_id_apps_id_fk
      foreign key (app_id) references public.users(id) on delete cascade`;
    const before = await snapshot();
    await expect(run()).rejects.toMatchObject({ code: 1 });
    expect(await snapshot()).toEqual(before);
  });

  it('검증되지 않은 기존 외래 키와 고아 자료를 성공으로 보고하지 않는다', async () => {
    await sql`alter table public.memos drop constraint memos_app_id_apps_id_fk`;
    await sql`insert into public.memos (app_id, content) values (gen_random_uuid(), 'Keep orphan for operator')`;
    await sql`alter table public.memos add constraint memos_app_id_apps_id_fk
      foreign key (app_id) references public.apps(id) on delete cascade not valid`;
    const before = await snapshot();
    await expect(run()).rejects.toMatchObject({ code: 1 });
    expect(await snapshot()).toEqual(before);
  });

  it('외래 키 없는 고아 자료를 지우지 않고 복구를 실패시킨다', async () => {
    await sql`alter table public.memos drop constraint memos_app_id_apps_id_fk`;
    await sql`insert into public.memos (app_id, content) values (gen_random_uuid(), 'Keep orphan for operator')`;
    const before = await snapshot();
    await expect(run()).rejects.toMatchObject({ code: 1 });
    expect(await snapshot()).toEqual(before);
  });

  it('외래 키 추가 실패는 새 테이블도 롤백하고 다음 실행에서 복구한다', async () => {
    await sql`drop table public.memos`;
    await sql.unsafe(`create function reject_recovery_fk() returns event_trigger language plpgsql as $$
      begin if current_query() ilike '%ADD CONSTRAINT%FOREIGN KEY%' then
        raise exception 'injected FK failure'; end if; end $$`);
    await sql`create event trigger reject_recovery_fk on ddl_command_start when tag in ('ALTER TABLE')
      execute function reject_recovery_fk()`;
    try {
      await expect(run()).rejects.toMatchObject({ code: 1 });
      expect((await sql`select to_regclass('public.memos') as relation`)[0].relation).toBeNull();
    } finally {
      await sql`drop event trigger reject_recovery_fk`;
      await sql`drop function reject_recovery_fk()`;
    }
    await run();
    await sql`insert into public.memos (app_id, content) values (${appId}, 'Recovered after failure')`;
    await sql`delete from public.apps where id = ${appId}`;
    expect(await sql`select * from public.memos`).toHaveLength(0);
  });

  it('후속 unique 추가 실패도 앞서 만든 테이블을 롤백하고 중복 자료를 보존한다', async () => {
    await sql`drop table public.memos`;
    await sql`alter table public.apps drop constraint apps_app_store_id_unique`;
    await sql`insert into public.apps (app_store_id, name) values ('id740', 'Keep duplicate')`;
    const apps = await sql`select * from public.apps order by id`;
    await expect(run()).rejects.toMatchObject({ code: 1 });
    expect((await sql`select to_regclass('public.memos') as relation`)[0].relation).toBeNull();
    expect(await sql`select * from public.apps order by id`).toEqual(apps);
  });

  it('다른 테이블의 동명 unique는 apps 제약 검사를 대체하지 않는다', async () => {
    await sql`alter table public.apps drop constraint apps_app_store_id_unique`;
    await sql`create schema recovery_shadow`;
    try {
      await sql`create table recovery_shadow.other_apps (external_id text,
          constraint apps_app_store_id_unique unique (external_id))`;
      await run();
      await expect(
        sql`insert into public.apps (app_store_id, name) values ('id740', 'Duplicate')`
      ).rejects.toMatchObject({ code: '23505' });
    } finally {
      await sql`drop schema recovery_shadow cascade`;
    }
  });

  it('동명 unique가 다른 컬럼을 제한하면 성공으로 인정하지 않는다', async () => {
    await sql`alter table public.apps drop constraint apps_app_store_id_unique`;
    await sql`alter table public.apps add constraint apps_app_store_id_unique unique (name)`;
    const before = await snapshot();
    await expect(run()).rejects.toMatchObject({ code: 1 });
    expect(await snapshot()).toEqual(before);
  });
});
