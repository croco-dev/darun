import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

describe('durable publication sync migration history', () => {
  it('keeps upstream 0011-0014 and generates one additive 0015 schema transaction', async () => {
    const directory = resolve(process.cwd(), 'scripts/migrations');
    const sql = await readFile(resolve(directory, '0015_eminent_ezekiel.sql'), 'utf8');
    const snapshot = JSON.parse(await readFile(resolve(directory, 'meta/0015_snapshot.json'), 'utf8')) as {
      tables: Record<string, { columns: Record<string, unknown>; indexes: Record<string, unknown> }>;
    };
    const journal = JSON.parse(await readFile(resolve(directory, 'meta/_journal.json'), 'utf8')) as {
      entries: Array<{ idx: number; tag: string }>;
    };
    expect(journal.entries.map(entry => entry.tag).slice(13, 16)).toEqual([
      '0013_stale_lester',
      '0014_superb_maverick',
      '0015_eminent_ezekiel',
    ]);
    expect(sql).toContain('CREATE TABLE "product_content_sync_intents"');
    expect(sql).toContain('ALTER TABLE "products" ADD COLUMN "content_revision"');
    expect(sql).toContain('ALTER TABLE "translation_jobs" ADD COLUMN "idempotency_key"');
    expect(sql).toContain('product_content_sync_identity');
    expect(snapshot.tables['public.products'].columns).toHaveProperty('content_revision');
    expect(snapshot.tables['public.translation_jobs'].columns).toHaveProperty('idempotency_key');
    expect(snapshot.tables['public.product_content_sync_intents'].indexes).toHaveProperty(
      'product_content_sync_identity'
    );
  });
});
