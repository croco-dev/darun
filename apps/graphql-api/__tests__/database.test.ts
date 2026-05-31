import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockConnect = vi.fn();

vi.mock('mongoose', () => ({
  connect: (...args: unknown[]) => mockConnect(...args),
}));

vi.mock('../src/config/environment', () => ({
  MONGODB_URI: 'mongodb://localhost:27017/test',
  IS_LOCAL: true,
}));

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
