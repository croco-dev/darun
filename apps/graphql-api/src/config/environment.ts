import assert from 'assert';

const requireEnv = (name: string): string => {
  const value = process.env[name];

  assert(value, `${name} not provided`);

  return value;
};

const optionalEnv = (name: string): string => process.env[name] ?? '';

const INFRA_ENV = requireEnv('INFRA_ENV');

export const IS_LOCAL = INFRA_ENV === 'local';
export const RUNNING_ENV = requireEnv('RUNNING_ENV');
export const DATABASE_URL = requireEnv('DATABASE_URL');
export const FIREBASE_PROJECT_ID = requireEnv('FIREBASE_PROJECT_ID');
export const FIREBASE_PRIVATE_KEY = (IS_LOCAL ? optionalEnv : requireEnv)('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n');
export const FIREBASE_CLIENT_EMAIL = (IS_LOCAL ? optionalEnv : requireEnv)('FIREBASE_CLIENT_EMAIL');
export const MONGODB_URI = requireEnv('MONGODB_URI');
export const CLOUDINARY_CLOUD_NAME = (IS_LOCAL ? optionalEnv : requireEnv)('CLOUDINARY_CLOUD_NAME');
export const CLOUDINARY_API_KEY = (IS_LOCAL ? optionalEnv : requireEnv)('CLOUDINARY_API_KEY');
export const CLOUDINARY_API_SECRET = (IS_LOCAL ? optionalEnv : requireEnv)('CLOUDINARY_API_SECRET');
