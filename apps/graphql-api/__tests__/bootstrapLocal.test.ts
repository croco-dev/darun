import { expect, it } from 'vitest';
import { spawnSync } from 'child_process';
import { join } from 'path';

it.each([
  'postgresql://localhost:secret@remote.invalid/darun',
  'postgresql://user:secret@localhost.remote.invalid/darun',
  'postgresql://user:secret@127.0.0.1/other',
  'postgresql://user:secret@127.0.0.1/darun?host=remote.invalid',
  'https://user:secret@localhost/darun',
  'invalid-secret',
])('로컬 DB 외 대상과 우회 URL을 접속 전에 거절한다: %s', databaseUrl => {
  const result = spawnSync(
    process.execPath,
    [
      require.resolve('tsx/cli'),
      join(__dirname, '..', 'scripts', 'bootstrap-local.ts'),
      '--reset',
      '--confirm-delete-local-data',
    ],
    {
      env: { ...process.env, DATABASE_URL: databaseUrl },
      encoding: 'utf8',
      timeout: 10_000,
    }
  );
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(1);
  expect(result.stdout).toBe('');
  expect(result.stderr).toContain('로컬 준비 실패:');
  expect(result.stderr).not.toContain('secret');
});
