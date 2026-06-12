import { ImageDeleter } from '@darun/images-domain';
import { ImageDeleterToken } from '@darun/images-domain';
import cloudinary from 'cloudinary';
import { Service } from 'typedi';

@Service(ImageDeleterToken)
export class CloudinaryImageDeleter implements ImageDeleter {
  async delete(imageUrl: string): Promise<void> {
    const publicId = this.extractPublicId(imageUrl);
    if (!publicId) {
      throw new Error('Invalid Cloudinary URL: cannot extract publicId');
    }

    const result = await cloudinary.v2.uploader.destroy(publicId);

    if (result.result !== 'ok' && result.result !== 'not found') {
      throw new Error('ImageDeleteError');
    }
  }

  private extractPublicId(imageUrl: string): string | null {
    try {
      const url = new URL(imageUrl);
      const pathParts = url.pathname.split('/');

      const uploadIndex = pathParts.findIndex(part => part === 'upload');
      if (uploadIndex === -1) {
        return null;
      }

      let startIndex = uploadIndex + 1;

      if (pathParts[startIndex]?.startsWith('v')) {
        startIndex += 1;
      }

      const publicIdWithExtension = pathParts.slice(startIndex).join('/');
      const lastDotIndex = publicIdWithExtension.lastIndexOf('.');

      if (lastDotIndex === -1) {
        return publicIdWithExtension;
      }

      return publicIdWithExtension.substring(0, lastDotIndex);
    } catch {
      return null;
    }
  }
}
