import { describe, expect, it } from 'vitest';
import { localSearchOptions } from '../src/local-search-sync';

const local = {
  INFRA_ENV: 'local',
  DATABASE_URL: 'postgresql://fixture:password@127.0.0.1:55499/darun',
  MONGODB_URI: 'mongodb://127.0.0.1:27099/darun',
};

describe('로컬 검색 명령의 입력 검증', () => {
  it('명시한 로컬 대상에서 기본 한 배치만 처리하도록 설정한다', () => {
    expect(localSearchOptions([], local)).toEqual({
      watch: false,
      limit: 50,
      databaseUrl: local.DATABASE_URL,
      mongodbUri: local.MONGODB_URI,
    });
    expect(localSearchOptions(['--watch', '--limit', '100'], local)).toMatchObject({ watch: true, limit: 100 });
    expect(localSearchOptions(['--limit', '1'], local)).toMatchObject({ limit: 1 });
  });

  it.each([
    {},
    { INFRA_ENV: 'prod' },
    { DATABASE_URL: '' },
    { MONGODB_URI: '' },
    { DATABASE_URL: 'postgresql://example.com/darun' },
    { DATABASE_URL: 'postgresql://127.0.0.1/production' },
    { DATABASE_URL: 'postgresql://127.0.0.1/darun?host=example.com' },
    { MONGODB_URI: 'mongodb+srv://example.com/darun' },
    { MONGODB_URI: 'mongodb://127.0.0.1,example.com/darun' },
    { MONGODB_URI: 'mongodb://127.0.0.1/darun?replicaSet=remote' },
    { MONGODB_URI: 'mongodb://localhost/darun' },
    { DATABASE_URL: 'postgres://[::1]:55499/darun' },
    { MONGODB_URI: 'mongodb://[::1]:27099/darun' },
    { MONGODB_URI: 'mongodb://127.0.0.1/darun#remote' },
  ])('누락되거나 원격·모호한 연결 설정을 거절한다: %j', override => {
    const env = Object.keys(override).length ? { ...local, ...override } : { ...local, INFRA_ENV: undefined };
    expect(() => localSearchOptions([], env)).toThrow();
  });

  it.each(['0', '101', '-1', '1.5', 'Infinity', '01', '10x'])('잘못된 limit을 거절한다: %s', limit => {
    expect(() => localSearchOptions(['--limit', limit], local)).toThrow();
  });

  it('알 수 없는 인자와 위치 인자를 거절한다', () => {
    expect(() => localSearchOptions(['--forever'], local)).toThrow();
    expect(() => localSearchOptions(['extra'], local)).toThrow();
  });
});
