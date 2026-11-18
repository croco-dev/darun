import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function checkMigrations(sqlFiles: Record<string, string>) {
  const fixture = mkdtempSync(join(tmpdir(), 'darun-check-migrations-test-'));

  try {
    const checker = join(fixture, 'scripts', 'check-migrations.mjs');
    const migrations = join(fixture, 'scripts', 'migrations');
    mkdirSync(join(migrations, 'meta'), { recursive: true });
    copyFileSync(join(__dirname, '..', 'scripts', 'check-migrations.mjs'), checker);
    writeFileSync(
      join(migrations, 'meta', '_journal.json'),
      JSON.stringify({ entries: [{ tag: '0000_baseline', when: 1 }] })
    );
    for (const [name, sql] of Object.entries(sqlFiles)) {
      writeFileSync(join(migrations, name), sql);
    }

    const drizzle = join(fixture, 'node_modules', 'drizzle-kit');
    mkdirSync(drizzle, { recursive: true });
    writeFileSync(join(drizzle, 'index.js'), '');
    writeFileSync(join(drizzle, 'bin.cjs'), "console.log('No schema changes, nothing to migrate');");

    const result = spawnSync(process.execPath, [checker], {
      encoding: 'utf8',
      timeout: 3000,
    });
    if (result.error) throw result.error;
    return result;
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
}

describe('check:migrations', () => {
  it('rejects an unregistered data migration before schema generation', () => {
    const result = checkMigrations({
      '0000_baseline.sql': 'CREATE TABLE example (id integer);',
      '0001_backfill.sql': 'SELECT 1;',
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Migration SQL is not registered in the journal: 0001_backfill.sql.');
    expect(result.stdout).not.toContain('No schema changes');
  });

  it.each<{ problem: string; files: Record<string, string>; error: string }>([
    {
      problem: 'missing',
      files: {},
      error: 'Migration journal references missing SQL: 0000_baseline.sql.',
    },
    {
      problem: 'empty',
      files: { '0000_baseline.sql': ' \n' },
      error: 'Migration SQL is empty: 0000_baseline.sql.',
    },
  ])('rejects a journal entry with $problem SQL', ({ files, error }) => {
    const result = checkMigrations(files);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(error);
    expect(result.stdout).not.toContain('No schema changes');
  });

  it('continues to schema generation when the journal and SQL agree', () => {
    const result = checkMigrations({ '0000_baseline.sql': 'SELECT 1;' });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Migration snapshots match the current schema.');
  });
});
