import { Token } from 'typedi';

export interface ImageRepository {
  signImageUpload(image: { folder: string; displayName: string }): {
    signature: string;
    timestamp: number;
  };
}

export const ImageRepositoryToken = new Token<ImageRepository>('ImageRepository');
