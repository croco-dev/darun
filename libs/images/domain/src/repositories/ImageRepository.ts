import { Token } from 'typedi';

export interface ImageRepository {
  signImageUpload(image: { uploadFolder: string; displayName: string }): {
    signature: string;
    timestamp: number;
    folder: string;
  };
}

export const ImageRepositoryToken = new Token<ImageRepository>('ImageRepository');
