import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';

const require = createRequire(__filename);
const root = resolve(__dirname, '../..');

function run(databaseUrl?: string, enabled = true) {
  const env = { ...process.env, W4_PG: enabled ? '1' : '0', W4_DATABASE_URL: databaseUrl };
  return spawnSync(
    process.execPath,
    [
      join(dirname(require.resolve('vitest/package.json')), 'vitest.mjs'),
      'run',
      'src/__tests__/W4JobLeaseRecovery.pg.test.ts',
    ],
    {
      cwd: root,
      env,
      encoding: 'utf8',
      timeout: 20_000,
    }
  );
}

describe('lease PostgreSQL suite isolation at the Vitest process boundary', { timeout: 30_000 }, () => {
  it.each([
    [undefined, 'W4_DATABASE_URL is required when W4_PG=1'],
    [
      'postgresql://sync:sync@remote.invalid/darun_lease_integrity',
      'Requires the isolated local darun_lease_integrity database',
    ],
    ['postgresql://sync:sync@127.0.0.1/darun', 'Requires the isolated local darun_lease_integrity database'],
    [
      'postgresql://sync:sync@127.0.0.1/darun_lease_integrity?host=remote.invalid',
      'Requires the isolated local darun_lease_integrity database',
    ],
  ])('rejects %s before opening a connection', (url, message) => {
    const result = run(url);
    expect(result.error).toBeUndefined();
    expect(result.status, result.stdout + result.stderr).toBe(1);
    expect(result.stdout + result.stderr).toContain(message);
    expect(result.stdout + result.stderr).not.toContain('ECONNREFUSED');
  });

  it('keeps ordinary local runs optional without the lease opt-in', () => {
    const result = run(undefined, false);
    expect(result.error).toBeUndefined();
    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(result.stdout).toContain('2 skipped');
  });
});
