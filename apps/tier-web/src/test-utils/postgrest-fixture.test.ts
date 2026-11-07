import { expect, it } from 'vitest';
import { assertLocalPostgrestFixture } from './postgrest-fixture';

const databaseUrl = 'postgresql://fixture:fixture@127.0.0.1:55525/darun_app_search';
const restUrl = 'http://127.0.0.1:30525';

it('allows disabled integration suites and their explicitly named local fixtures', () => {
  expect(() => assertLocalPostgrestFixture(undefined, undefined, 'darun_app_search')).not.toThrow();
  expect(() => assertLocalPostgrestFixture(databaseUrl, restUrl, 'darun_app_search')).not.toThrow();
  expect(() =>
    assertLocalPostgrestFixture(
      'postgresql://fixture:fixture@localhost/darun_memo_integrity',
      restUrl,
      'darun_memo_integrity'
    )
  ).not.toThrow();
});

it.each([
  [databaseUrl, undefined],
  [undefined, restUrl],
  ['postgresql://fixture:fixture@remote.invalid/darun_app_search', restUrl],
  ['postgresql://fixture:fixture@localhost.remote.invalid/darun_app_search', restUrl],
  ['postgresql://fixture:fixture@localhost/darun_memo_integrity', restUrl],
  [databaseUrl, 'http://remote.invalid'],
  [databaseUrl, 'https://localhost'],
])('rejects incomplete or mismatched fixture URLs (%s, %s) before connecting', (database, api) => {
  expect(() => assertLocalPostgrestFixture(database, api, 'darun_app_search')).toThrow();
});
