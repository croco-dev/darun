import cloudinary from 'cloudinary';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('cloudinary', () => ({
  default: {
    v2: {
      uploader: {
        destroy: vi.fn(),
      },
    },
  },
}));

import { CloudinaryImageDeleter } from '../CloudinaryImageDeleter';

const validUrl = 'https://res.cloudinary.com/demo/image/upload/v1234/products/shoe.jpg';
const invalidUrl = 'https://example.com/image.jpg';

describe('CloudinaryImageDeleter', () => {
  let deleter: CloudinaryImageDeleter;
  const mockDestroy = cloudinary.v2.uploader.destroy as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    deleter = new CloudinaryImageDeleter();
    mockDestroy.mockReset();
  });

  describe('delete', () => {
    it('성공 시 아무것도 throw하지 않는다', async () => {
      mockDestroy.mockResolvedValue({ result: 'ok' });

      await expect(deleter.delete(validUrl)).resolves.toBeUndefined();
      expect(mockDestroy).toHaveBeenCalledWith('products/shoe');
    });

    it("result가 'ok'가 아니면 ImageDeleteError를 throw한다", async () => {
      mockDestroy.mockResolvedValue({ result: 'not found' });

      await expect(deleter.delete(validUrl)).rejects.toThrow('ImageDeleteError');
      expect(mockDestroy).toHaveBeenCalledWith('products/shoe');
    });

    it("result가 'ok'가 아닌 다른 값이면 ImageDeleteError를 throw한다", async () => {
      mockDestroy.mockResolvedValue({ result: 'error' });

      await expect(deleter.delete(validUrl)).rejects.toThrow('ImageDeleteError');
    });

    it('Cloudinary가 reject하면 에러를 전파한다', async () => {
      mockDestroy.mockRejectedValue(new Error('Network error'));

      await expect(deleter.delete(validUrl)).rejects.toThrow('Network error');
    });

    it('유효하지 않은 URL이면 Invalid URL 에러를 throw한다', async () => {
      await expect(deleter.delete(invalidUrl)).rejects.toThrow('Invalid Cloudinary URL: cannot extract publicId');
      expect(mockDestroy).not.toHaveBeenCalled();
    });

    it('version prefix가 없는 URL도 처리한다', async () => {
      const urlWithoutVersion = 'https://res.cloudinary.com/demo/image/upload/products/shoe.jpg';
      mockDestroy.mockResolvedValue({ result: 'ok' });

      await expect(deleter.delete(urlWithoutVersion)).resolves.toBeUndefined();
      expect(mockDestroy).toHaveBeenCalledWith('products/shoe');
    });
  });
});
