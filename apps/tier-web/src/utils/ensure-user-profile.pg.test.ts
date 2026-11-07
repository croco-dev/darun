import { assertLocalPostgrestFixture } from '@/test-utils/postgrest-fixture';
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { ensureUserProfile } from './ensure-user-profile';

const databaseUrl = process.env.PROFILE_TEST_DATABASE_URL;
const restUrl = process.env.PROFILE_TEST_POSTGREST_URL;
const fixture = vi.hoisted(() => ({ client: undefined as unknown }));
vi.mock('@/utils/supabase/server', () => ({ createAdminClient: () => fixture.client }));
assertLocalPostgrestFixture(databaseUrl, restUrl, 'darun_profile_integrity');

describe.skipIf(!databaseUrl)('profile creation through PostgREST and PostgreSQL', () => {
  const sql = postgres(databaseUrl!, { max: 2, onnotice: () => {}, connection: { statement_timeout: 5000 } });
  const user = { id: 'a9e42957-5596-4d12-a599-034cff66f475', email: 'profile@example.invalid' };
  let ownsTables = false;
  beforeAll(async () => {
    const [existing] =
      await sql`select count(*)::integer as count from information_schema.tables where table_schema = 'public'`;
    if (existing.count !== 0) throw new Error('Profile tests require an empty dedicated database');
    ownsTables = true;
    await sql.begin(async transaction => {
      const ddl = await readFile(new URL('../../drizzle/0000_careless_leech.sql', import.meta.url), 'utf8');
      await transaction.unsafe(ddl);
    });
    await sql`notify pgrst, 'reload schema'`;
    const deadline = Date.now() + 5000;
    while (true) {
      const response = await fetch(`${restUrl}/users?select=id`, { signal: AbortSignal.timeout(1000) });
      if (response.ok) break;
      if (Date.now() >= deadline) throw new Error(`PostgREST fixture not ready: ${response.status}`);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    fixture.client = createClient(restUrl!, 'profile-fixture-only', {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const url = new URL(String(input));
          url.pathname = url.pathname.replace(/^\/rest\/v1/, '');
          const headers = new Headers(init?.headers);
          headers.delete('authorization');
          headers.delete('apikey');
          return fetch(url, { ...init, headers, signal: AbortSignal.timeout(5000) });
        },
      },
    });
  });
  beforeEach(async () => {
    await sql`delete from public.users`;
  });
  afterAll(async () => {
    if (ownsTables) await sql`drop table public.tiers, public.apps, public.users cascade`;
    await sql.end();
  });

  it('converges concurrent retries to one non-admin row', async () => {
    expect(await Promise.all([ensureUserProfile(user), ensureUserProfile(user)])).toEqual([true, true]);
    expect(await sql`select id, email, is_admin from public.users`).toEqual([{ ...user, is_admin: false }]);
  });

  it('preserves all existing administrator values on conflicting UID', async () => {
    await sql`insert into public.users (id, email, is_admin) values (${user.id}, 'original@example.invalid', true)`;
    const before = await sql`select * from public.users`;
    expect(await ensureUserProfile(user)).toBe(true);
    expect(await sql`select * from public.users`).toEqual(before);
  });

  it('refuses an email belonging to another UID without merging accounts or changing permissions', async () => {
    await sql`insert into public.users (id, email, is_admin) values ('ce99aeec-0382-45e2-a938-37a11094f765', ${user.email}, true)`;
    const before = await sql`select * from public.users`;
    expect(await ensureUserProfile(user)).toBe(false);
    expect(await sql`select * from public.users`).toEqual(before);
  });

  it('recovers a rejected write on the same UID after the storage failure clears', async () => {
    await sql`alter table public.users add constraint profile_fixture_rejection check (false) not valid`;
    expect(await ensureUserProfile(user)).toBe(false);
    expect(await sql`select * from public.users`).toEqual([]);
    await sql`alter table public.users drop constraint profile_fixture_rejection`;
    expect(await ensureUserProfile(user)).toBe(true);
    expect(await sql`select id, email, is_admin from public.users`).toEqual([{ ...user, is_admin: false }]);
  });
});
