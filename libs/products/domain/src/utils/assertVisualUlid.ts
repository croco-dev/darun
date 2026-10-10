import { productInvalidArgs } from '../errors/productError';

const ULID_PATTERN = /^[0-9A-HJKMNP-TV-Z]{26}$/;

export function assertVisualUlid(id: string, message: string): void {
  if (!ULID_PATTERN.test(id)) {
    throw productInvalidArgs(message);
  }
}
