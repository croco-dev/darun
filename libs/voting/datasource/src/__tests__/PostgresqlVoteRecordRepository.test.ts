import 'reflect-metadata';
import { UpvoteProduct } from '@darun/voting-domain';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PostgresqlVoteRecordRepository } from '../repositories/PostgresqlVoteRecordRepository';

// Explicit opt-in URL must point at a disposable local database, never production.
const databaseUrl = process.env['VOTING_TEST_DATABASE_URL'];
const suite = databaseUrl ? describe : describe.skip;
suite('atomic vote writes (isolated PostgreSQL schema)', () => {
  const schema = `vote_test_${randomUUID().replace(/-/g, '')}`;
  let admin: ReturnType<typeof postgres>;
  let client: ReturnType<typeof postgres>;
  let repository: PostgresqlVoteRecordRepository;
  const previousSalt = process.env['VOTE_IP_SALT'];
  beforeAll(async () => {
    const url = new URL(databaseUrl!);
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
      throw new Error('Local disposable database required');
    admin = postgres(databaseUrl!, { max: 1 });
    await admin.unsafe(`create schema ${schema}`);
    client = postgres(databaseUrl!, { max: 12, connection: { search_path: schema } });
    await client.unsafe(
      `create table votes (id varchar(26) primary key, target_id varchar(26) not null unique, count bigint not null default 0, created_at timestamp not null default now())`
    );
    await client.unsafe(
      `create table vote_records (id varchar(26) primary key, target_id varchar(26) not null, voter_ip_hash varchar(64) not null, created_at timestamp not null default now(), unique(target_id, voter_ip_hash))`
    );
    process.env['VOTE_IP_SALT'] = 'isolated-voting-test-salt';
    repository = new PostgresqlVoteRecordRepository(drizzle(client) as never);
  });
  afterAll(async () => {
    if (previousSalt === undefined) delete process.env['VOTE_IP_SALT'];
    else process.env['VOTE_IP_SALT'] = previousSalt;
    await client?.end();
    if (admin) {
      await admin.unsafe(`drop schema if exists ${schema} cascade`);
      await admin.end();
    }
  });
  it('allows exactly ten of eleven distinct targets for one IP across database connections', async () => {
    const upvote = new UpvoteProduct(repository);
    const results = await Promise.allSettled(
      Array.from({ length: 11 }, (_, i) => upvote.execute({ productId: `target-${i}`, voterIp: '127.0.0.42' }))
    );
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(10);
    expect(results.filter(result => result.status === 'rejected').map(result => result.reason.code)).toEqual([
      'voting/rate-limit-exceeded',
    ]);
    const [row] =
      await client`select (select count(*) from vote_records)::int as records, (select sum(count) from votes)::int as votes`;
    expect(row).toEqual({ records: 10, votes: 10 });
  });
  it('keeps per-target uniqueness and does not increment on duplicates', async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 11 }, () => repository.incrementVote('duplicate', 'other-ip'))
    );
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(
      results
        .filter(result => result.status === 'rejected')
        .every(result => result.reason.code === 'voting/duplicate-vote')
    ).toBe(true);
    const [row] = await client`select count::int from votes where target_id = 'duplicate'`;
    expect(row.count).toBe(1);
  });
  it('rolls back the count if the vote record insert fails', async () => {
    await client.unsafe(`alter table vote_records add constraint reject_failure_target check (target_id <> 'failure')`);
    await expect(repository.incrementVote('failure', 'failure-ip')).rejects.toThrow();
    expect(await client`select * from votes where target_id = 'failure'`).toHaveLength(0);
    expect(await client`select * from vote_records where target_id = 'failure'`).toHaveLength(0);
  });
});
