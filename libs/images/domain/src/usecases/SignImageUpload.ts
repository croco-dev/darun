import { Inject, Service } from 'typedi';
import { ImageRepository, ImageRepositoryToken } from '../repositories/ImageRepository';

@Service()
export class SignImageUpload {
  constructor(@Inject(ImageRepositoryToken) private readonly imageRepository: ImageRepository) {}

  execute({ folder, displayName }: { folder: string; displayName: string }): {
    signature: string;
    timestamp: number;
    folder: string;
  } {
    return this.imageRepository.signImageUpload({ uploadFolder: folder, displayName });
  }
}
