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
  it.each(['images/magazines', 'images/editor', 'images/logos', 'images/screenshots/example-product'])(
    '허용 폴더 %s는 기존 경로 그대로 서명한다',
    async folder => {
      const repo = createMockRepository();
      const reader = { findOneBySlug: vi.fn().mockResolvedValue(null) };
      const result = await new SignImageUpload(repo, reader).execute({ folder, displayName: 'test.jpg' });
      expect(result).toEqual({ signature: 'test-sig', timestamp: 1234567890, folder: 'test-folder' });
      expect(repo.signImageUpload).toHaveBeenCalledWith({ uploadFolder: folder, displayName: 'test.jpg' });
      expect(reader.findOneBySlug).not.toHaveBeenCalled();
    }
  );

  it.each([
    'images/screenshots/example-product/extra',
    'images/screenshots/exa.mple',
    'images/screenshots/../../etc',
    'images/screenshots/',
    'images/screenshots/Example-Product',
    'images/upload',
  ])('허용되지 않은 폴더 %s와 미등록 상품은 서명하지 않는다', async folder => {
    const repo = createMockRepository();
    const useCase = new SignImageUpload(repo, { findOneBySlug: vi.fn().mockResolvedValue(null) });
    await expect(useCase.execute({ folder, displayName: 'shot.jpg' })).rejects.toThrow(InvalidFolderError);
    expect(repo.signImageUpload).not.toHaveBeenCalled();
  });

  it.each(['', '   ', 'foo..bar.jpg', 'foo/bar.jpg', 'foo\\bar.jpg', 'foo\x00bar.jpg'])(
    '잘못된 displayName %j는 조회와 서명 전에 거절한다',
    async displayName => {
      const repo = createMockRepository();
      const reader = { findOneBySlug: vi.fn() };
      await expect(
        new SignImageUpload(repo, reader).execute({ folder: 'images/magazines', displayName })
      ).rejects.toThrow(InvalidDisplayNameError);
      expect(reader.findOneBySlug).not.toHaveBeenCalled();
      expect(repo.signImageUpload).not.toHaveBeenCalled();
    }
  );

  it('공백이 섞인 유효한 displayName은 변환 없이 서명한다', async () => {
    const repo = createMockRepository();
    const useCase = new SignImageUpload(repo, { findOneBySlug: vi.fn().mockResolvedValue(null) });
    const result = await useCase.execute({ folder: 'images/magazines', displayName: '  hello  ' });
    expect(result).toEqual({ signature: 'test-sig', timestamp: 1234567890, folder: 'test-folder' });
    expect(repo.signImageUpload).toHaveBeenCalledWith({ uploadFolder: 'images/magazines', displayName: '  hello  ' });
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
