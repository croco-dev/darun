import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const REQUIRED_VARS = [
  'INFRA_ENV',
  'RUNNING_ENV',
  'DATABASE_URL',
  'FIREBASE_PROJECT_ID',
  'MONGODB_URI',
  'VOTE_IP_SALT',
] as const;

const OPTIONAL_WHEN_LOCAL_VARS = [
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
] as const;

const ALL_VARS = [...REQUIRED_VARS, ...OPTIONAL_WHEN_LOCAL_VARS];

function setAllRequiredVars(infraEnv: string) {
  process.env.INFRA_ENV = infraEnv;
  process.env.RUNNING_ENV = 'test';
  process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
  process.env.FIREBASE_PROJECT_ID = 'test-project';
  process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
  process.env.VOTE_IP_SALT = 'test-salt';
}

function setAllVars(infraEnv: string) {
  setAllRequiredVars(infraEnv);
  process.env.FIREBASE_PRIVATE_KEY = 'fake-private-key';
  process.env.FIREBASE_CLIENT_EMAIL = 'test@test.com';
  process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
  process.env.CLOUDINARY_API_KEY = 'test-api-key';
  process.env.CLOUDINARY_API_SECRET = 'test-api-secret';
}

function saveEnv(): Record<string, string | undefined> {
  const saved: Record<string, string | undefined> = {};
  for (const key of ALL_VARS) {
    saved[key] = process.env[key];
  }
  return saved;
}

function restoreEnv(saved: Record<string, string | undefined>) {
  for (const key of ALL_VARS) {
    if (key in saved) {
      const value = saved[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    } else {
      delete process.env[key];
    }
  }
}

describe('environment variable contract', () => {
  let envBackup: Record<string, string | undefined>;

  beforeEach(() => {
    vi.resetModules();
    envBackup = saveEnv();
    for (const key of ALL_VARS) {
      delete process.env[key];
    }
  });

  afterEach(() => {
    restoreEnv(envBackup);
  });

  describe('always-required env vars', () => {
    for (const infraEnv of ['local', 'production'] as const) {
      describe(`when INFRA_ENV=${infraEnv}`, () => {
        for (const envVar of REQUIRED_VARS) {
          describe(envVar, () => {
            const setup = infraEnv === 'local' ? setAllRequiredVars : setAllVars;

            it('rejects missing value', async () => {
              setup(infraEnv);
              delete process.env[envVar];

              await expect(import('../src/config/environment')).rejects.toThrow(`${envVar} not provided`);
            });

            it('rejects empty string', async () => {
              setup(infraEnv);
              process.env[envVar] = '';

              await expect(import('../src/config/environment')).rejects.toThrow(`${envVar} not provided`);
            });
          });
        }
      });
    }
  });

  describe('optional-in-local env vars', () => {
    for (const infraEnv of ['local', 'production'] as const) {
      describe(`when INFRA_ENV=${infraEnv}`, () => {
        for (const envVar of OPTIONAL_WHEN_LOCAL_VARS) {
          if (infraEnv === 'local') {
            describe(envVar, () => {
              it('allows missing value', async () => {
                setAllRequiredVars('local');
                delete process.env[envVar];

                const env = await import('../src/config/environment');

                if (envVar === 'FIREBASE_PRIVATE_KEY') {
                  expect(env.FIREBASE_PRIVATE_KEY).toBe('');
                } else {
                  expect(env[envVar as keyof typeof env]).toBe('');
                }
              });

              it('allows empty string', async () => {
                setAllRequiredVars('local');
                process.env[envVar] = '';

                const env = await import('../src/config/environment');

                if (envVar === 'FIREBASE_PRIVATE_KEY') {
                  expect(env.FIREBASE_PRIVATE_KEY).toBe('');
                } else {
                  expect(env[envVar as keyof typeof env]).toBe('');
                }
              });
            });
          } else {
            describe(envVar, () => {
              it('rejects missing value', async () => {
                setAllVars('production');
                delete process.env[envVar];

                await expect(import('../src/config/environment')).rejects.toThrow(`${envVar} not provided`);
              });

              it('rejects empty string', async () => {
                setAllVars('production');
                process.env[envVar] = '';

                await expect(import('../src/config/environment')).rejects.toThrow(`${envVar} not provided`);
              });
            });
          }
        }
      });
    }
  });
});
