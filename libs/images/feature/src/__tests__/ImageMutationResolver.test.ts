import 'reflect-metadata';

vi.mock('typedi', () => ({
  Service: () => () => {},
}));

vi.mock('@darun/utils-apollo-server', () => ({
  AuthRole: { Admin: 'Admin' },
}));

vi.mock('type-graphql', () => {
  const methodDecorator = () => (_target: object, _key: string, descriptor: PropertyDescriptor) => descriptor;
  return {
    Arg: () => () => vi.fn(),
    Authorized: methodDecorator,
    Mutation: methodDecorator,
    ObjectType: () => () => {},
    Field: () => () => {},
    InputType: () => () => {},
    Resolver: () => () => {},
  };
});

import { describe, expect, it, vi } from 'vitest';
import { ImageMutationResolver } from '../Image.mutation.resolver';

describe('ImageMutationResolver', () => {
  describe('signImageUpload', () => {
    it('이미지 업로드 서명 URL을 반환한다', async () => {
      const signImageUploadUseCase = { execute: vi.fn() };
      const payload = {
        uploadUrl: 'https://cloudinary.com/upload',
        publicId: 'img-1',
        apiKey: 'key',
        timestamp: 123,
        signature: 'sig',
      };
      signImageUploadUseCase.execute.mockResolvedValue(payload);

      const resolver = new ImageMutationResolver(signImageUploadUseCase as never);
      const input = { folder: 'products', filename: 'logo.png' };
      const result = await resolver.signImageUpload(input as never);

      expect(signImageUploadUseCase.execute).toHaveBeenCalledWith(input);
      expect(result).toBe(payload);
    });
  });
});
