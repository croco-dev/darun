import { Inject, Service } from 'typedi';
import type { ImageRepository } from '../repositories/ImageRepository';
import { ImageRepositoryToken } from '../repositories/ImageRepository';
import type { ScreenshotUploadProductReader } from '../repositories/ScreenshotUploadProductReader';
import { ScreenshotUploadProductReaderToken } from '../repositories/ScreenshotUploadProductReader';

const ALLOWED_STATIC_FOLDERS = ['images/magazines', 'images/editor', 'images/logos'] as const;

const SCREENSHOT_FOLDER_PREFIX = 'images/screenshots/';
const SCREENSHOT_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class InvalidFolderError extends Error {
  constructor(folder: string) {
    super(`Invalid folder: ${folder}`);
    this.name = 'InvalidFolderError';
  }
}

export class InvalidDisplayNameError extends Error {
  constructor(displayName: string) {
    super(`Invalid displayName: ${displayName}`);
    this.name = 'InvalidDisplayNameError';
  }
}

function isValidFolder(folder: string): boolean {
  if (ALLOWED_STATIC_FOLDERS.includes(folder as (typeof ALLOWED_STATIC_FOLDERS)[number])) {
    return true;
  }

  if (folder.startsWith(SCREENSHOT_FOLDER_PREFIX)) {
    const slug = folder.slice(SCREENSHOT_FOLDER_PREFIX.length);
    return slug !== '' && SCREENSHOT_SLUG_REGEX.test(slug);
  }

  return false;
}

function isValidDisplayName(displayName: string): boolean {
  if (!displayName || displayName.trim() === '') {
    return false;
  }
  if (displayName.includes('..')) {
    return false;
  }
  if (displayName.includes('/') || displayName.includes('\\')) {
    return false;
  }
  if (/[\x00-\x1f\x7f]/.test(displayName)) {
    return false;
  }
  return true;
}

@Service()
export class SignImageUpload {
  constructor(
    @Inject(ImageRepositoryToken)
    private readonly imageRepository: ImageRepository,
    @Inject(ScreenshotUploadProductReaderToken)
    private readonly productReader: ScreenshotUploadProductReader
  ) {}

  async execute({ folder, displayName }: { folder: string; displayName: string }): Promise<{
    signature: string;
    timestamp: number;
    folder: string;
  }> {
    if (!isValidDisplayName(displayName)) {
      throw new InvalidDisplayNameError(displayName);
    }

    let uploadFolder = folder;
    if (!isValidFolder(folder)) {
      if (!folder.startsWith(SCREENSHOT_FOLDER_PREFIX)) throw new InvalidFolderError(folder);
      const slug = folder.slice(SCREENSHOT_FOLDER_PREFIX.length);
      // Never use a legacy slug as a path. Resolve its immutable owner instead.
      if (!slug || /[\\/\x00-\x1f\x7f]/.test(slug)) throw new InvalidFolderError(folder);
      const product = await this.productReader.findOneBySlug(slug);
      if (!product || !/^[a-zA-Z0-9_-]{1,26}$/.test(product.id)) throw new InvalidFolderError(folder);
      uploadFolder = `images/screenshots-by-product/${product.id}`;
    }

    return this.imageRepository.signImageUpload({
      uploadFolder,
      displayName,
    });
  }
}
