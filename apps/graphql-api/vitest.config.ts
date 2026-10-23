import { createNodeConfig } from '@darun/utils-vitest-config';
import ts from 'typescript';
import { defineConfig } from 'vitest/config';

export default defineConfig(
  createNodeConfig({
    plugins: [
      {
        name: 'graphql-decorator-metadata',
        enforce: 'pre',
        transform(source, id) {
          if (
            !id.endsWith('.ts') ||
            !/@(Field|Arg|Resolver|Service|Inject|ObjectType|InputType|ArgsType)\b/.test(source)
          )
            return;
          return ts.transpileModule(source, {
            compilerOptions: {
              target: ts.ScriptTarget.ES2022,
              module: ts.ModuleKind.ESNext,
              experimentalDecorators: true,
              emitDecoratorMetadata: true,
            },
            fileName: id,
          }).outputText;
        },
      },
    ],
    esbuild: {
      tsconfigRaw: {
        compilerOptions: {
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
        },
      },
    },
    test: {
      passWithNoTests: false,
      include: ['__tests__/**/*.test.ts'],
      exclude: ['**/tests/**', '**/node_modules/**'],
    },
  })
);
