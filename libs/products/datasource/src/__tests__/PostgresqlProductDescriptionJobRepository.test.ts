import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PostgresqlProductDescriptionJobRepository } from '../repositories/PostgresqlProductDescriptionJobRepository';

describe('PostgresqlProductDescriptionJobRepository', () => {
  let mockDb: {
    insert: ReturnType<typeof vi.fn>;
    select: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockDb = {
      insert: vi.fn(),
      select: vi.fn(),
      update: vi.fn(),
    };
  });

  it('createJob inserts a job and returns the created entity', async () => {
    const fakeRow = {
      id: 'job-1',
      productId: 'prod-1',
      status: 'pending',
      message: '소개 생성 작업이 대기 중입니다.',
      error: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const returningMock = vi.fn().mockResolvedValue([fakeRow]);
    const valuesMock = vi.fn().mockReturnValue({ returning: returningMock });
    mockDb.insert.mockReturnValue({ values: valuesMock });

    const repo = new PostgresqlProductDescriptionJobRepository(mockDb as never);
    const result = await repo.createJob({
      productId: 'prod-1',
      status: 'pending',
    });

    expect(mockDb.insert).toHaveBeenCalled();
    expect(result.id).toBe('job-1');
    expect(result.productId).toBe('prod-1');
    expect(result.status).toBe('pending');
  });

  it('findJobById finds and returns job if exists', async () => {
    const fakeRow = {
      id: 'job-1',
      productId: 'prod-1',
      status: 'in_progress',
      message: '진행 중',
      error: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const limitMock = vi.fn().mockResolvedValue([fakeRow]);
    const whereMock = vi.fn().mockReturnValue({ limit: limitMock });
    const fromMock = vi.fn().mockReturnValue({ where: whereMock });
    mockDb.select.mockReturnValue({ from: fromMock });

    const repo = new PostgresqlProductDescriptionJobRepository(mockDb as never);
    const result = await repo.findJobById('job-1');

    expect(result).toEqual({
      id: 'job-1',
      productId: 'prod-1',
      status: 'in_progress',
      message: '진행 중',
      error: null,
      createdAt: fakeRow.createdAt,
      updatedAt: fakeRow.updatedAt,
    });
  });

  it('findJobById returns null when job is not found', async () => {
    const limitMock = vi.fn().mockResolvedValue([]);
    const whereMock = vi.fn().mockReturnValue({ limit: limitMock });
    const fromMock = vi.fn().mockReturnValue({ where: whereMock });
    mockDb.select.mockReturnValue({ from: fromMock });

    const repo = new PostgresqlProductDescriptionJobRepository(mockDb as never);
    const result = await repo.findJobById('non-existent');

    expect(result).toBeNull();
  });

  it('updateJobStatus updates status and returns updated entity', async () => {
    const updatedRow = {
      id: 'job-1',
      productId: 'prod-1',
      status: 'completed',
      message: '완료',
      error: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const returningMock = vi.fn().mockResolvedValue([updatedRow]);
    const whereMock = vi.fn().mockReturnValue({ returning: returningMock });
    const setMock = vi.fn().mockReturnValue({ where: whereMock });
    mockDb.update.mockReturnValue({ set: setMock });

    const repo = new PostgresqlProductDescriptionJobRepository(mockDb as never);
    const result = await repo.updateJobStatus('job-1', 'completed', { message: '완료' });

    expect(mockDb.update).toHaveBeenCalled();
    expect(result.status).toBe('completed');
    expect(result.message).toBe('완료');
  });

  it('findJobs returns list of jobs with status filter and pagination', async () => {
    const fakeRow = {
      id: 'job-1',
      productId: 'prod-1',
      status: 'failed',
      message: '실패',
      error: '429 RateLimit',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const offsetMock = vi.fn().mockResolvedValue([fakeRow]);
    const limitMock = vi.fn().mockReturnValue({ offset: offsetMock });
    const orderByMock = vi.fn().mockReturnValue({ limit: limitMock });
    const whereMock = vi.fn().mockReturnValue({ orderBy: orderByMock });
    const fromMock = vi.fn().mockReturnValue({ where: whereMock, orderBy: orderByMock });
    mockDb.select.mockReturnValue({ from: fromMock });

    const repo = new PostgresqlProductDescriptionJobRepository(mockDb as never);
    const results = await repo.findJobs({ status: 'failed', limit: 10, offset: 0 });

    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe('job-1');
    expect(results[0]?.status).toBe('failed');
    expect(whereMock).toHaveBeenCalled();
  });

  it('findJobs returns empty array if error is thrown', async () => {
    mockDb.select.mockImplementation(() => {
      throw new Error('Database connection failed');
    });

    const repo = new PostgresqlProductDescriptionJobRepository(mockDb as never);
    const results = await repo.findJobs();

    expect(results).toEqual([]);
  });
});
