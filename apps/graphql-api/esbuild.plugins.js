/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
const { esbuildDecorators } = require('@kang-heewon/esbuild-plugin-typescript-decorators');
const { sentryEsbuildPlugin } = require('@sentry/esbuild-plugin');

const IS_LOCAL = process.env['INFRA_ENV'] === 'local';

module.exports = [
  esbuildDecorators({
    tsconfig: 'tsconfig.lambda.json',
  }),
  sentryEsbuildPlugin({
    authToken: process.env.SENTRY_AUTH_TOKEN,
    org: 'croco',
    project: 'darun-server',
    url: 'https://sentry.io/',
    disable: IS_LOCAL,
  }),
];
