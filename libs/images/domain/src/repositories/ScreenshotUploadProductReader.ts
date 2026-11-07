import { Token } from 'typedi';

export interface ScreenshotUploadProductReader {
  findOneBySlug(slug: string): Promise<{ id: string } | null>;
}

export const ScreenshotUploadProductReaderToken = new Token<ScreenshotUploadProductReader>(
  'ScreenshotUploadProductReader'
);
