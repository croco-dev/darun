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

  signImageUpload({ folder, displayName }: { folder: string; displayName: string }): {
    signature: string;
    timestamp: number;
  } {
    const timestamp = Math.round(new Date().getTime() / 1000);

    const signature = cloudinary.v2.utils.api_sign_request(
      {
        timestamp,
        displayName,
        folder: this.config.environment + '/' + folder,
        resource_type: 'image',
      },
      this.apiSecret
    );
    return { timestamp, signature };
  }
}
