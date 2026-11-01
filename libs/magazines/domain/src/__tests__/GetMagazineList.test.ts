import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import type { MagazineRepository } from '../repositories/MagazineRepository';
import { GetMagazineList } from '../usecases/GetMagazineList';

function fixture() {
  const findAllWithPagination = vi.fn().mockResolvedValue({ data: [], total: 103 });
  const repository = { findAllWithPagination } as unknown as MagazineRepository;
  return { usecase: new GetMagazineList(repository), findAllWithPagination };
}

describe('GetMagazineList', () => {
  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    'page=%s는 저장소 실행 전에 거절한다',
    async page => {
      const { usecase, findAllWithPagination } = fixture();
      await expect(usecase.execute({ page, limit: 50 })).rejects.toMatchObject({
        code: 'magazine/invalid-args',
      });
      expect(findAllWithPagination).not.toHaveBeenCalled();
    }
  );

  it.each([0, -1, 101, 1.5, NaN, Infinity, null])('limit=%s는 저장소 실행 전에 거절한다', async limit => {
    const { usecase, findAllWithPagination } = fixture();
    await expect(usecase.execute({ page: 1, limit: limit as number })).rejects.toMatchObject({
      code: 'magazine/invalid-args',
    });
    expect(findAllWithPagination).not.toHaveBeenCalled();
  });

  it('계산한 offset이 안전한 정수 범위를 넘으면 거절한다', async () => {
    const { usecase, findAllWithPagination } = fixture();
    await expect(usecase.execute({ page: Number.MAX_SAFE_INTEGER, limit: 50 })).rejects.toMatchObject({
      code: 'magazine/invalid-args',
    });
    expect(findAllWithPagination).not.toHaveBeenCalled();
  });

  it.each([1, 100])('허용한 limit=%i와 결과를 그대로 전달한다', async limit => {
    const { usecase, findAllWithPagination } = fixture();
    const result = { data: [], total: 103 };
    findAllWithPagination.mockResolvedValue(result);
    expect(await usecase.execute({ page: 3, limit })).toBe(result);
    expect(findAllWithPagination).toHaveBeenCalledWith(3, limit);
  });

  it('limit 생략 시 기존 기본값 50을 사용한다', async () => {
    const { usecase, findAllWithPagination } = fixture();
    await usecase.execute({ page: 1 });
    expect(findAllWithPagination).toHaveBeenCalledWith(1, 50);
  });

  it('저장소 오류는 빈 목록으로 바꾸지 않는다', async () => {
    const { usecase, findAllWithPagination } = fixture();
    const error = new Error('read failed');
    findAllWithPagination.mockRejectedValue(error);
    await expect(usecase.execute({ page: 1, limit: 50 })).rejects.toBe(error);
  });
});
