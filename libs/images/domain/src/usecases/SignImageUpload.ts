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

import { Inject, Service } from 'typedi';
import type { ImageRepository } from '../repositories/ImageRepository';
import { ImageRepositoryToken } from '../repositories/ImageRepository';

@Service()
export class SignImageUpload {
  constructor(
    @Inject(ImageRepositoryToken)
    private readonly imageRepository: ImageRepository
  ) {}

  execute({ folder, displayName }: { folder: string; displayName: string }): {
    signature: string;
    timestamp: number;
    folder: string;
  } {
    if (!isValidFolder(folder)) {
      throw new InvalidFolderError(folder);
    }
    if (!isValidDisplayName(displayName)) {
      throw new InvalidDisplayNameError(displayName);
    }

    return this.imageRepository.signImageUpload({
      uploadFolder: folder,
      displayName,
    });
  }
}
