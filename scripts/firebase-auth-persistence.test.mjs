import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const composeFile = fileURLToPath(new URL('../docker-compose.yml', import.meta.url));
const override = `services:
  firebase-auth:
    ports: !override ['127.0.0.1::9099']
`;

test('the local Auth emulator restores accounts after container replacement', async t => {
  const project = `darun-auth-test-${randomUUID()}`;
  const compose = (...args) =>
    execFileSync('docker', ['compose', '-p', project, '-f', composeFile, '-f', '-', ...args], {
      encoding: 'utf8',
      input: override,
      timeout: 240_000,
    }).trim();

  const start = () => {
    compose('up', '-d', '--no-deps', '--force-recreate', '--wait', '--wait-timeout', '90', 'firebase-auth');
    const address = compose('port', 'firebase-auth', '9099');
    assert.match(address, /^127\.0\.0\.1:\d+$/);
    return `http://${address}`;
  };

  const replace = () => {
    compose('stop', 'firebase-auth');
    return start();
  };

  const account = name => ({
    email: `${name}@example.test`,
    password: 'synthetic-test-password',
    returnSecureToken: true,
  });

  const auth = async (origin, operation, credentials) => {
    const response = await fetch(
      `${origin}/identitytoolkit.googleapis.com/v1/accounts:${operation}?key=local-api-key`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(credentials),
        redirect: 'error',
        signal: AbortSignal.timeout(5_000),
      }
    );
    const body = await response.json();
    assert.equal(response.status, 200, `${operation}: ${body.error?.message ?? response.status}`);
    assert.ok(body.localId, `${operation} did not return a Firebase UID`);
    return body.localId;
  };

  t.after(() => compose('down', '--volumes'));
  const first = account('first');
  const second = account('second');
  let origin = start();
  const firstUid = await auth(origin, 'signUp', first);

  origin = replace();
  assert.equal(await auth(origin, 'signInWithPassword', first), firstUid);
  const secondUid = await auth(origin, 'signUp', second);

  origin = replace();
  assert.equal(await auth(origin, 'signInWithPassword', first), firstUid);
  assert.equal(await auth(origin, 'signInWithPassword', second), secondUid);
});
