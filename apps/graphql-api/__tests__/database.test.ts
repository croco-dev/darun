import { DrizzleToken } from '@darun/provider-database';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockConnect = vi.fn();
const mockPostgres = vi.fn();
const mockDrizzle = vi.fn();
const mockContainerSet = vi.fn();

vi.mock('mongoose', () => ({
  connect: (...args: unknown[]) => mockConnect(...args),
}));

vi.mock('postgres', () => ({
  default: (...args: unknown[]) => mockPostgres(...args),
}));

vi.mock('drizzle-orm/postgres-js', () => ({
  drizzle: (...args: unknown[]) => mockDrizzle(...args),
}));

vi.mock('typedi', async importOriginal => {
  const actual = await importOriginal<typeof import('typedi')>();
  return {
    ...actual,
    Container: {
      ...actual.Container,
      set: (...args: unknown[]) => mockContainerSet(...args),
    },
  };
});

vi.mock('../src/config/environment', () => ({
  DATABASE_URL: 'postgresql://localhost:5432/darun',
  MONGODB_URI: 'mongodb://localhost:27017/test',
  IS_LOCAL: true,
}));

describe('createPostgresConnection', () => {
  beforeEach(() => {
    vi.resetModules();
    mockPostgres.mockReset();
    mockDrizzle.mockReset();
    mockContainerSet.mockReset();
  });

  it('should initialize postgres and drizzle lazily', async () => {
    const mockClient = { client: 'postgres' };
    const mockDb = { db: 'drizzle' };
    mockPostgres.mockReturnValue(mockClient);
    mockDrizzle.mockReturnValue(mockDb);

    const { createPostgresConnection } = await import('../src/config/database');
    createPostgresConnection();

    expect(mockPostgres).toHaveBeenCalledTimes(1);
    expect(mockPostgres).toHaveBeenCalledWith('postgresql://localhost:5432/darun', { prepare: false });
    expect(mockDrizzle).toHaveBeenCalledTimes(1);
    expect(mockDrizzle).toHaveBeenCalledWith(mockClient);
    expect(mockContainerSet).toHaveBeenCalledTimes(1);
    expect(mockContainerSet).toHaveBeenCalledWith(DrizzleToken, mockDb);
  });

  it('should retry when postgres() throws synchronously', async () => {
    const mockClient = { client: 'postgres' };
    const mockDb = { db: 'drizzle' };
    mockPostgres.mockImplementationOnce(() => {
      throw new Error('PG init failed');
    });
    mockPostgres.mockReturnValue(mockClient);
    mockDrizzle.mockReturnValue(mockDb);

    const { createPostgresConnection } = await import('../src/config/database');

    expect(() => createPostgresConnection()).toThrow('PG init failed');
    expect(mockPostgres).toHaveBeenCalledTimes(1);
    expect(mockDrizzle).not.toHaveBeenCalled();
    expect(mockContainerSet).not.toHaveBeenCalled();

    createPostgresConnection();

    expect(mockPostgres).toHaveBeenCalledTimes(2);
    expect(mockDrizzle).toHaveBeenCalledWith(mockClient);
    expect(mockContainerSet).toHaveBeenCalledWith(DrizzleToken, mockDb);
  });

  it('should only initialize once on repeated successful calls', async () => {
    const mockClient = { client: 'postgres' };
    const mockDb = { db: 'drizzle' };
    mockPostgres.mockReturnValue(mockClient);
    mockDrizzle.mockReturnValue(mockDb);

    const { createPostgresConnection } = await import('../src/config/database');
    createPostgresConnection();
    createPostgresConnection();

    expect(mockPostgres).toHaveBeenCalledTimes(1);
    expect(mockDrizzle).toHaveBeenCalledTimes(1);
    expect(mockContainerSet).toHaveBeenCalledTimes(1);
  });
});

describe('createMongodbConnection', () => {
  beforeEach(() => {
    vi.resetModules();
    mockConnect.mockReset();
  });

  it('should return a Promise on first call', async () => {
    mockConnect.mockResolvedValue({} as mongoose.Mongoose);
    const { createMongodbConnection } = await import('../src/config/database');
    const result = createMongodbConnection();

    expect(result).toBeInstanceOf(Promise);
    await result;
  });

  it('should call mongoose.connect only once on concurrent calls', async () => {
    mockConnect.mockResolvedValue({} as mongoose.Mongoose);
    const { createMongodbConnection } = await import('../src/config/database');
    const p1 = createMongodbConnection();
    const p2 = createMongodbConnection();

    await Promise.all([p1, p2]);

    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  it('should propagate rejection from mongoose.connect', async () => {
    mockConnect.mockRejectedValue(new Error('Connection refused'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { createMongodbConnection } = await import('../src/config/database');

    await expect(createMongodbConnection()).rejects.toThrow('Connection refused');
    consoleSpy.mockRestore();
  });
});
