import { describe, it, expect, vi } from 'vitest';
import type { ImageRepository } from '../repositories/ImageRepository';
import { SignImageUpload, InvalidFolderError, InvalidDisplayNameError } from './SignImageUpload';

function createMockRepository(): ImageRepository {
  return {
    signImageUpload: vi.fn().mockReturnValue({
      signature: 'test-sig',
      timestamp: 1234567890,
      folder: 'test-folder',
    }),
  };
}

describe('SignImageUpload usecase', () => {
  it('허용: images/magazines 폴더는 서명 생성에 통과한다', async () => {
    const repo = createMockRepository();
    const useCase = new SignImageUpload(repo, { findOneBySlug: vi.fn().mockResolvedValue(null) });
    const result = await useCase.execute({ folder: 'images/magazines', displayName: 'test.jpg' });
    expect(result).toEqual({ signature: 'test-sig', timestamp: 1234567890, folder: 'test-folder' });
    expect(repo.signImageUpload).toHaveBeenCalledWith({ uploadFolder: 'images/magazines', displayName: 'test.jpg' });
  });

  it('허용: images/editor 폴더는 서명 생성에 통과한다', async () => {
    const repo = createMockRepository();
    const useCase = new SignImageUpload(repo, { findOneBySlug: vi.fn().mockResolvedValue(null) });
    const result = await useCase.execute({ folder: 'images/editor', displayName: 'test.jpg' });
    expect(result).toEqual({ signature: 'test-sig', timestamp: 1234567890, folder: 'test-folder' });
    expect(repo.signImageUpload).toHaveBeenCalledWith({ uploadFolder: 'images/editor', displayName: 'test.jpg' });
  });

  it('허용: images/logos 폴더는 서명 생성에 통과한다', async () => {
    const repo = createMockRepository();
    const useCase = new SignImageUpload(repo, { findOneBySlug: vi.fn().mockResolvedValue(null) });
    const result = await useCase.execute({ folder: 'images/logos', displayName: 'test.jpg' });
    expect(result).toEqual({ signature: 'test-sig', timestamp: 1234567890, folder: 'test-folder' });
    expect(repo.signImageUpload).toHaveBeenCalledWith({ uploadFolder: 'images/logos', displayName: 'test.jpg' });
  });

  it('허용: images/screenshots/{slug} 형태의 동적 폴더는 서명 생성에 통과한다', async () => {
    const repo = createMockRepository();
    const useCase = new SignImageUpload(repo, { findOneBySlug: vi.fn().mockResolvedValue(null) });
    const result = await useCase.execute({ folder: 'images/screenshots/example-product', displayName: 'shot.jpg' });
    expect(result).toEqual({ signature: 'test-sig', timestamp: 1234567890, folder: 'test-folder' });
    expect(repo.signImageUpload).toHaveBeenCalledWith({
      uploadFolder: 'images/screenshots/example-product',
      displayName: 'shot.jpg',
    });
  });

  it('거부: 추가 경로 세그먼트가 있는 스크린샷 폴더는 차단된다', async () => {
    const repo = createMockRepository();
    const useCase = new SignImageUpload(repo, { findOneBySlug: vi.fn().mockResolvedValue(null) });
    await expect(
      useCase.execute({ folder: 'images/screenshots/example-product/extra', displayName: 'shot.jpg' })
    ).rejects.toThrow(InvalidFolderError);
    expect(repo.signImageUpload).not.toHaveBeenCalled();
  });

  it('거부: 미등록된 점 포함 slug는 서명하지 않는다', async () => {
    const repo = createMockRepository();
    const useCase = new SignImageUpload(repo, { findOneBySlug: vi.fn().mockResolvedValue(null) });
    await expect(useCase.execute({ folder: 'images/screenshots/exa.mple', displayName: 'shot.jpg' })).rejects.toThrow(
      InvalidFolderError
    );
    expect(repo.signImageUpload).not.toHaveBeenCalled();
  });

  it('거부: ..이 포함된 스크린샷 폴더는 차단된다', async () => {
    const repo = createMockRepository();
    const useCase = new SignImageUpload(repo, { findOneBySlug: vi.fn().mockResolvedValue(null) });
    await expect(useCase.execute({ folder: 'images/screenshots/../../etc', displayName: 'shot.jpg' })).rejects.toThrow(
      InvalidFolderError
    );
    expect(repo.signImageUpload).not.toHaveBeenCalled();
  });

  it('거부: 빈 슬러그 스크린샷 폴더는 차단된다', async () => {
    const repo = createMockRepository();
    const useCase = new SignImageUpload(repo, { findOneBySlug: vi.fn().mockResolvedValue(null) });
    await expect(useCase.execute({ folder: 'images/screenshots/', displayName: 'shot.jpg' })).rejects.toThrow(
      InvalidFolderError
    );
    expect(repo.signImageUpload).not.toHaveBeenCalled();
  });

  it('거부: 미등록된 대문자 slug는 서명하지 않는다', async () => {
    const repo = createMockRepository();
    const useCase = new SignImageUpload(repo, { findOneBySlug: vi.fn().mockResolvedValue(null) });
    await expect(
      useCase.execute({ folder: 'images/screenshots/Example-Product', displayName: 'shot.jpg' })
    ).rejects.toThrow(InvalidFolderError);
    expect(repo.signImageUpload).not.toHaveBeenCalled();
  });

  it('거부: 관련 없는 접두사를 가진 폴더는 차단된다', async () => {
    const repo = createMockRepository();
    const useCase = new SignImageUpload(repo, { findOneBySlug: vi.fn().mockResolvedValue(null) });
    await expect(useCase.execute({ folder: 'images/upload', displayName: 'test.jpg' })).rejects.toThrow(
      InvalidFolderError
    );
    expect(repo.signImageUpload).not.toHaveBeenCalled();
  });

  it('거부: displayName이 빈값이면 차단된다', async () => {
    const repo = createMockRepository();
    const useCase = new SignImageUpload(repo, { findOneBySlug: vi.fn().mockResolvedValue(null) });
    await expect(useCase.execute({ folder: 'images/magazines', displayName: '' })).rejects.toThrow(
      InvalidDisplayNameError
    );
    expect(repo.signImageUpload).not.toHaveBeenCalled();
  });

  it('거부: displayName이 공백이면 차단된다', async () => {
    const repo = createMockRepository();
    const useCase = new SignImageUpload(repo, { findOneBySlug: vi.fn().mockResolvedValue(null) });
    await expect(useCase.execute({ folder: 'images/magazines', displayName: '   ' })).rejects.toThrow(
      InvalidDisplayNameError
    );
    expect(repo.signImageUpload).not.toHaveBeenCalled();
  });

  it('거부: displayName에 ..이 포함되면 차단된다', async () => {
    const repo = createMockRepository();
    const useCase = new SignImageUpload(repo, { findOneBySlug: vi.fn().mockResolvedValue(null) });
    await expect(useCase.execute({ folder: 'images/magazines', displayName: 'foo..bar.jpg' })).rejects.toThrow(
      InvalidDisplayNameError
    );
    expect(repo.signImageUpload).not.toHaveBeenCalled();
  });

  it('거부: displayName에 경로 구분자가 포함되면 차단된다', async () => {
    const repo = createMockRepository();
    const useCase = new SignImageUpload(repo, { findOneBySlug: vi.fn().mockResolvedValue(null) });
    await expect(useCase.execute({ folder: 'images/magazines', displayName: 'foo/bar.jpg' })).rejects.toThrow(
      InvalidDisplayNameError
    );
    await expect(useCase.execute({ folder: 'images/magazines', displayName: 'foo\\bar.jpg' })).rejects.toThrow(
      InvalidDisplayNameError
    );
    expect(repo.signImageUpload).not.toHaveBeenCalled();
  });

  it('거부: displayName에 제어 문자가 포함되면 차단된다', async () => {
    const repo = createMockRepository();
    const useCase = new SignImageUpload(repo, { findOneBySlug: vi.fn().mockResolvedValue(null) });
    await expect(useCase.execute({ folder: 'images/magazines', displayName: 'foo\x00bar.jpg' })).rejects.toThrow(
      InvalidDisplayNameError
    );
    expect(repo.signImageUpload).not.toHaveBeenCalled();
  });

  it('허용: displayName에 공백이 섞여 있어도 전체 문자열이 비어있지만 않으면 통과한다', async () => {
    const repo = createMockRepository();
    const useCase = new SignImageUpload(repo, { findOneBySlug: vi.fn().mockResolvedValue(null) });
    const result = await useCase.execute({ folder: 'images/magazines', displayName: '  hello  ' });
    expect(result).toEqual({ signature: 'test-sig', timestamp: 1234567890, folder: 'test-folder' });
  });
});

describe('기존 상품의 스크린샷 폴더', () => {
  it.each(['My_Product', '기존 상품', 'old.app', 'old--app'])(
    '%s를 서버가 확인한 상품 ID 경로로 서명한다',
    async slug => {
      const repo = createMockRepository();
      const reader = { findOneBySlug: vi.fn().mockResolvedValue({ id: '01ARZ3NDEKTSV4RRFFQ69G5FAV' }) };
      await new SignImageUpload(repo, reader).execute({
        folder: `images/screenshots/${slug}`,
        displayName: 'shot.png',
      });
      expect(reader.findOneBySlug).toHaveBeenCalledWith(slug);
      expect(repo.signImageUpload).toHaveBeenCalledWith({
        uploadFolder: 'images/screenshots-by-product/01ARZ3NDEKTSV4RRFFQ69G5FAV',
        displayName: 'shot.png',
      });
    }
  );

  it('기존의 안전한 비 ULID 상품 ID도 그대로 경로에 사용한다', async () => {
    const repo = createMockRepository();
    await new SignImageUpload(repo, { findOneBySlug: async () => ({ id: 'legacy-product-42' }) }).execute({
      folder: 'images/screenshots/My_Product',
      displayName: 'shot.png',
    });
    expect(repo.signImageUpload).toHaveBeenCalledWith({
      uploadFolder: 'images/screenshots-by-product/legacy-product-42',
      displayName: 'shot.png',
    });
  });

  it.each(['../etc', 'old/app', 'old\\app', 'old\0app', ''])(
    '경로·제어문자 %j는 조회와 서명 전에 거절한다',
    async slug => {
      const repo = createMockRepository();
      const reader = { findOneBySlug: vi.fn().mockResolvedValue({ id: '01ARZ3NDEKTSV4RRFFQ69G5FAV' }) };
      await expect(
        new SignImageUpload(repo, reader).execute({ folder: `images/screenshots/${slug}`, displayName: 'shot.png' })
      ).rejects.toThrow(InvalidFolderError);
      expect(reader.findOneBySlug).not.toHaveBeenCalled();
      expect(repo.signImageUpload).not.toHaveBeenCalled();
    }
  );

  it.each([null, { id: '../arbitrary' }, { id: 'bad\0id' }])(
    '미존재 또는 안전하지 않은 ID %j는 서명하지 않는다',
    async product => {
      const repo = createMockRepository();
      await expect(
        new SignImageUpload(repo, { findOneBySlug: async () => product }).execute({
          folder: 'images/screenshots/My_Product',
          displayName: 'shot.png',
        })
      ).rejects.toThrow(InvalidFolderError);
      expect(repo.signImageUpload).not.toHaveBeenCalled();
    }
  );

  it('상품 조회 장애는 서명이나 원래 폴더로 우회하지 않는다', async () => {
    const repo = createMockRepository();
    const error = new Error('read unavailable');
    await expect(
      new SignImageUpload(repo, {
        findOneBySlug: async () => {
          throw error;
        },
      }).execute({
        folder: 'images/screenshots/My_Product',
        displayName: 'shot.png',
      })
    ).rejects.toBe(error);
    expect(repo.signImageUpload).not.toHaveBeenCalled();
  });
});
