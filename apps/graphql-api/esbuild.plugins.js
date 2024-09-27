/* eslint-disable @typescript-eslint/no-var-requires */
const { esbuildDecorators } = require('@kang-heewon/esbuild-plugin-typescript-decorators');
const { sentryEsbuildPlugin } = require('@sentry/esbuild-plugin');

module.exports = [
  esbuildDecorators({}),
  sentryEsbuildPlugin({
    authToken: process.env.SENTRY_AUTH_TOKEN,
    org: 'croco',
    project: 'darun-server',
    url: 'https://sentry.io/',
  }),
];
