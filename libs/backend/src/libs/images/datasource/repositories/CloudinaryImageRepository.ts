import cloudinary from 'cloudinary';
import { Service } from 'typedi';
import { ImageRepository, ImageRepositoryToken } from '../../domain';

export class CloudinaryImageRepositoryConfig {
  constructor(public readonly environment: string) {}
}

@Service(ImageRepositoryToken)
export class CloudinaryImageRepository implements ImageRepository {
  private readonly apiSecret: string;

  constructor(private readonly config: CloudinaryImageRepositoryConfig) {
    this.apiSecret = cloudinary.v2.config().api_secret ?? '';
    if (!this.apiSecret) {
      throw new Error('Cloudinary API secret is required');
    }
  }

  signImageUpload({ uploadFolder, displayName }: { uploadFolder: string; displayName: string }): {
    signature: string;
    timestamp: number;
    folder: string;
  } {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = this.config.environment + '/' + uploadFolder;
    const signature = cloudinary.v2.utils.api_sign_request(
      {
        timestamp,
        displayName,
        folder,
        resource_type: 'image',
      },
      this.apiSecret
    );
    return { timestamp, signature, folder };
  }
}
