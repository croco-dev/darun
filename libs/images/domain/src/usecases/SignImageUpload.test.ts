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
  it('허용: images/magazines 폴더는 서명 생성에 통과한다', () => {
    const repo = createMockRepository();
    const useCase = new SignImageUpload(repo);
    const result = useCase.execute({ folder: 'images/magazines', displayName: 'test.jpg' });
    expect(result).toEqual({ signature: 'test-sig', timestamp: 1234567890, folder: 'test-folder' });
    expect(repo.signImageUpload).toHaveBeenCalledWith({ uploadFolder: 'images/magazines', displayName: 'test.jpg' });
  });

  it('허용: images/editor 폴더는 서명 생성에 통과한다', () => {
    const repo = createMockRepository();
    const useCase = new SignImageUpload(repo);
    const result = useCase.execute({ folder: 'images/editor', displayName: 'test.jpg' });
    expect(result).toEqual({ signature: 'test-sig', timestamp: 1234567890, folder: 'test-folder' });
    expect(repo.signImageUpload).toHaveBeenCalledWith({ uploadFolder: 'images/editor', displayName: 'test.jpg' });
  });

  it('허용: images/logos 폴더는 서명 생성에 통과한다', () => {
    const repo = createMockRepository();
    const useCase = new SignImageUpload(repo);
    const result = useCase.execute({ folder: 'images/logos', displayName: 'test.jpg' });
    expect(result).toEqual({ signature: 'test-sig', timestamp: 1234567890, folder: 'test-folder' });
    expect(repo.signImageUpload).toHaveBeenCalledWith({ uploadFolder: 'images/logos', displayName: 'test.jpg' });
  });

  it('허용: images/screenshots/{slug} 형태의 동적 폴더는 서명 생성에 통과한다', () => {
    const repo = createMockRepository();
    const useCase = new SignImageUpload(repo);
    const result = useCase.execute({ folder: 'images/screenshots/example-product', displayName: 'shot.jpg' });
    expect(result).toEqual({ signature: 'test-sig', timestamp: 1234567890, folder: 'test-folder' });
    expect(repo.signImageUpload).toHaveBeenCalledWith({
      uploadFolder: 'images/screenshots/example-product',
      displayName: 'shot.jpg',
    });
  });

  it('거부: 추가 경로 세그먼트가 있는 스크린샷 폴더는 차단된다', () => {
    const repo = createMockRepository();
    const useCase = new SignImageUpload(repo);
    expect(() =>
      useCase.execute({ folder: 'images/screenshots/example-product/extra', displayName: 'shot.jpg' })
    ).toThrow(InvalidFolderError);
    expect(repo.signImageUpload).not.toHaveBeenCalled();
  });

  it('거부: 점이 포함된 slug 스크린샷 폴더는 차단된다', () => {
    const repo = createMockRepository();
    const useCase = new SignImageUpload(repo);
    expect(() => useCase.execute({ folder: 'images/screenshots/exa.mple', displayName: 'shot.jpg' })).toThrow(
      InvalidFolderError
    );
    expect(repo.signImageUpload).not.toHaveBeenCalled();
  });

  it('거부: ..이 포함된 스크린샷 폴더는 차단된다', () => {
    const repo = createMockRepository();
    const useCase = new SignImageUpload(repo);
    expect(() => useCase.execute({ folder: 'images/screenshots/../../etc', displayName: 'shot.jpg' })).toThrow(
      InvalidFolderError
    );
    expect(repo.signImageUpload).not.toHaveBeenCalled();
  });

  it('거부: 빈 슬러그 스크린샷 폴더는 차단된다', () => {
    const repo = createMockRepository();
    const useCase = new SignImageUpload(repo);
    expect(() => useCase.execute({ folder: 'images/screenshots/', displayName: 'shot.jpg' })).toThrow(
      InvalidFolderError
    );
    expect(repo.signImageUpload).not.toHaveBeenCalled();
  });

  it('거부: 대문자가 포함된 slug 스크린샷 폴더는 차단된다', () => {
    const repo = createMockRepository();
    const useCase = new SignImageUpload(repo);
    expect(() => useCase.execute({ folder: 'images/screenshots/Example-Product', displayName: 'shot.jpg' })).toThrow(
      InvalidFolderError
    );
    expect(repo.signImageUpload).not.toHaveBeenCalled();
  });

  it('거부: 관련 없는 접두사를 가진 폴더는 차단된다', () => {
    const repo = createMockRepository();
    const useCase = new SignImageUpload(repo);
    expect(() => useCase.execute({ folder: 'images/upload', displayName: 'test.jpg' })).toThrow(InvalidFolderError);
    expect(repo.signImageUpload).not.toHaveBeenCalled();
  });

  it('거부: displayName이 빈값이면 차단된다', () => {
    const repo = createMockRepository();
    const useCase = new SignImageUpload(repo);
    expect(() => useCase.execute({ folder: 'images/magazines', displayName: '' })).toThrow(InvalidDisplayNameError);
    expect(repo.signImageUpload).not.toHaveBeenCalled();
  });

  it('거부: displayName이 공백이면 차단된다', () => {
    const repo = createMockRepository();
    const useCase = new SignImageUpload(repo);
    expect(() => useCase.execute({ folder: 'images/magazines', displayName: '   ' })).toThrow(InvalidDisplayNameError);
    expect(repo.signImageUpload).not.toHaveBeenCalled();
  });

  it('거부: displayName에 ..이 포함되면 차단된다', () => {
    const repo = createMockRepository();
    const useCase = new SignImageUpload(repo);
    expect(() => useCase.execute({ folder: 'images/magazines', displayName: 'foo..bar.jpg' })).toThrow(
      InvalidDisplayNameError
    );
    expect(repo.signImageUpload).not.toHaveBeenCalled();
  });

  it('거부: displayName에 경로 구분자가 포함되면 차단된다', () => {
    const repo = createMockRepository();
    const useCase = new SignImageUpload(repo);
    expect(() => useCase.execute({ folder: 'images/magazines', displayName: 'foo/bar.jpg' })).toThrow(
      InvalidDisplayNameError
    );
    expect(() => useCase.execute({ folder: 'images/magazines', displayName: 'foo\\bar.jpg' })).toThrow(
      InvalidDisplayNameError
    );
    expect(repo.signImageUpload).not.toHaveBeenCalled();
  });

  it('거부: displayName에 제어 문자가 포함되면 차단된다', () => {
    const repo = createMockRepository();
    const useCase = new SignImageUpload(repo);
    expect(() => useCase.execute({ folder: 'images/magazines', displayName: 'foo\x00bar.jpg' })).toThrow(
      InvalidDisplayNameError
    );
    expect(repo.signImageUpload).not.toHaveBeenCalled();
  });

  it('허용: displayName에 공백이 섞여 있어도 전체 문자열이 비어있지만 않으면 통과한다', () => {
    const repo = createMockRepository();
    const useCase = new SignImageUpload(repo);
    const result = useCase.execute({ folder: 'images/magazines', displayName: '  hello  ' });
    expect(result).toEqual({ signature: 'test-sig', timestamp: 1234567890, folder: 'test-folder' });
  });
});
