import assert from 'assert';

assert(process.env['INFRA_ENV'], 'INFRA_ENV not provided');
assert(process.env['RUNNING_ENV'], 'RUNNING_ENV not provided');
assert(process.env['DATABASE_URL'], 'DATABASE_URL not provided');
assert(process.env['FIREBASE_PROJECT_ID'], 'FIREBASE_PROJECT_ID not provided');
assert(process.env['FIREBASE_PRIVATE_KEY'], 'FIREBASE_PRIVATE_KEY not provided');
assert(process.env['FIREBASE_CLIENT_EMAIL'], 'FIREBASE_CLIENT_EMAIL not provided');
assert(process.env['MONGODB_URI'], 'MONGODB_URI not provided');
assert(process.env['CLOUDINARY_CLOUD_NAME'], 'CLOUDINARY_CLOUD_NAME not provided');
assert(process.env['CLOUDINARY_API_KEY'], 'CLOUDINARY_API_KEY not provided');
assert(process.env['CLOUDINARY_API_SECRET'], 'CLOUDINARY_API_SECRET not provided');

export const IS_LOCAL = process.env['INFRA_ENV'] === 'local';
export const RUNNING_ENV = process.env['RUNNING_ENV'] as 'development' | 'production';
export const DATABASE_URL = process.env['DATABASE_URL'];
export const FIREBASE_PROJECT_ID = process.env['FIREBASE_PROJECT_ID'];
export const FIREBASE_PRIVATE_KEY = process.env['FIREBASE_PRIVATE_KEY'];
export const FIREBASE_CLIENT_EMAIL = process.env['FIREBASE_CLIENT_EMAIL'];
export const MONGODB_URI = process.env['MONGODB_URI'];
export const CLOUDINARY_CLOUD_NAME = process.env['CLOUDINARY_CLOUD_NAME'];
export const CLOUDINARY_API_KEY = process.env['CLOUDINARY_API_KEY'];
export const CLOUDINARY_API_SECRET = process.env['CLOUDINARY_API_SECRET'];
