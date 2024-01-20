import assert from 'assert';

assert(process.env['INFRA_ENV'], 'INFRA_ENV not provided');
assert(process.env['DATABASE_URL'], 'DATABASE_URL not provided');
assert(process.env['DATABASE_USERNAME'], 'DATABASE_USERNAME not provided');
assert(process.env['DATABASE_PASSWORD'], 'DATABASE_PASSWORD not provided');

export const IS_LOCAL = process.env['INFRA_ENV'] === 'local';
export const DATABASE_URL = process.env['DATABASE_URL'];
export const DATABASE_USERNAME = process.env['DATABASE_USERNAME'];
export const DATABASE_PASSWORD = process.env['DATABASE_PASSWORD'];
