/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
const { esbuildDecorators } = require('@kang-heewon/esbuild-plugin-typescript-decorators');
const { sentryEsbuildPlugin } = require('@sentry/esbuild-plugin');
const fs = require('fs');

const IS_LOCAL = process.env['INFRA_ENV'] === 'local';
const reflectMetadataSource = fs.readFileSync(require.resolve('reflect-metadata'), 'utf8');

module.exports = [
  {
    name: 'inline-reflect-metadata',
    setup(build) {
      const existingBanner = build.initialOptions.banner?.js ?? '';
      build.initialOptions.banner = {
        ...build.initialOptions.banner,
        js: `${reflectMetadataSource}\n${existingBanner}`,
      };
    },
  },
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
