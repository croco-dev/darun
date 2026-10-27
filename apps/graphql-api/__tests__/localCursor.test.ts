import { expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = resolve(__dirname, '..');

it('샘플의 로컬 키로 서명한 커서를 새 API 프로세스에서도 읽는다', async () => {
  const sample = parseEnv(readFileSync(resolve(root, '.env.sample'), 'utf8'));
  const env = { PATH: process.env.PATH, ...sample, VOTE_IP_SALT: 'local-fixture-vote-salt' };
  const bootstrap = `
    require('./src/config/environment.ts');
    const { Cursor } = require('../../libs/shared/utils-apollo-server/src/pagination/Cursor.ts');
  `;
  const first = await run(
    process.execPath,
    ['--import', 'tsx', '-e', `${bootstrap} process.stdout.write(Cursor.encode({ id: 'local-product-37' }, ['id']));`],
    { cwd: root, env, timeout: 10000 }
  );
  const cursor = first.stdout;
  const payload = 'id__KEY_DELIMITER__local-product-37';
  const signature = createHmac('sha256', sample['CURSOR_SIGNATURE_SECRET']!).update(payload).digest('hex');
  expect(Buffer.from(cursor, 'base64').toString()).toBe(`${payload}__SIGNATURE_DELIMITER__${signature}`);

  const next = await run(
    process.execPath,
    [
      '--import',
      'tsx',
      '-e',
      `${bootstrap} process.stdout.write(JSON.stringify(Cursor.decode(process.argv[1], ['id'])));`,
      cursor,
    ],
    { cwd: root, env, timeout: 10000 }
  );
  expect(JSON.parse(next.stdout)).toEqual({ id: 'local-product-37' });
});
