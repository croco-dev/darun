/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
const { sentryEsbuildPlugin } = require('@sentry/esbuild-plugin');
const ts = require('typescript');
const fs = require('fs');
const path = require('path');

const IS_LOCAL = process.env['INFRA_ENV'] === 'local';
const reflectMetadataSource = fs.readFileSync(require.resolve('reflect-metadata'), 'utf8');

const FIND_COMMENT_REGEXP = /(\/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*+\/)|(\/\/.*)/g;

const parseTsConfig = (tsconfig, cwd = process.cwd()) => {
  const fileName = ts.findConfigFile(cwd, ts.sys.fileExists, tsconfig);
  if (!fileName) {
    throw new Error(`Fail to load tsconfig file (${tsconfig})!`);
  }
  const text = ts.sys.readFile(fileName);
  if (!text) {
    throw new Error(`Tsconfig file content must not be empty!`);
  }
  const result = ts.parseConfigFileTextToJson(fileName, text);
  if (result.error) {
    throw new Error(`Fail to parser tsconfig file: ` + result.error.messageText);
  }
  const parsedConfig = ts.parseJsonConfigFileContent(result.config, ts.sys, path.dirname(fileName));
  if (parsedConfig.errors[0]) {
    throw new Error(`Fail to parser tsconfig file: ` + parsedConfig.errors[0].messageText);
  }
  return parsedConfig;
};

const findDecorators = content => {
  content = content?.trim?.();
  if (!content) {
    return false;
  }
  content = content.replace(FIND_COMMENT_REGEXP, '').trim();
  const lines = content
    .split(/\r?\n/)
    .filter(line => !line.startsWith('import ') && !line.startsWith('} from ') && line.indexOf('@') > -1);
  return lines.length > 0;
};

const esbuildDecoratorsEsm = (options = {}) => ({
  name: 'tsc-decorators-esm',
  setup(build) {
    const cwd = options.cwd || process.cwd();
    const force = options.force === true;
    const tsconfig = options.tsconfig || build.initialOptions?.tsconfig || path.join(cwd, 'tsconfig.json');
    const tsConfig = parseTsConfig(tsconfig, cwd);
    if (tsConfig?.options?.sourcemap) {
      tsConfig.options.sourcemap = false;
      tsConfig.options.inlineSources = true;
      tsConfig.options.inlineSourceMap = true;
    }
    tsConfig.options.module = ts.ModuleKind.ESNext;

    build.onLoad({ filter: /\.ts$/ }, async args => {
      if (!force && !tsConfig?.options?.emitDecoratorMetadata) {
        return;
      }
      const tsContent = await fs.promises.readFile(args.path, 'utf8').catch(err => {
        console.error(`Fail access file (${args.path}): `, err);
        return null;
      });
      if (!tsContent || !findDecorators(tsContent)) {
        return;
      }
      const program = ts.transpileModule(tsContent, {
        compilerOptions: tsConfig.options,
      });
      return {
        contents: program.outputText,
        loader: 'js',
      };
    });
  },
});

module.exports = [
  {
    name: 'inline-reflect-metadata',
    setup(build) {
      const existingBanner = build.initialOptions.banner?.js ?? '';
      build.initialOptions.banner = {
        ...build.initialOptions.banner,
        js: `(function () {\n${reflectMetadataSource}\n})();\n${existingBanner}`,
      };
    },
  },
  esbuildDecoratorsEsm({
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
