import { createNodeConfig } from '@darun/utils-vitest-config';
import ts from 'typescript';
import { defineConfig } from 'vitest/config';

export default defineConfig(
  createNodeConfig({
    esbuild: { keepNames: true },
    plugins: [
      {
        name: 'atomic-decorator-metadata',
        enforce: 'pre',
        transform(source, id) {
          if (
            !id.endsWith('.ts') ||
            !/@(?:Service|Inject|Field|Resolver|ObjectType|InputType|ArgsType|Mutation|Query)\b/.test(source)
          )
            return;
          return ts.transpileModule(source, {
            compilerOptions: {
              target: ts.ScriptTarget.ES2022,
              module: ts.ModuleKind.ESNext,
              experimentalDecorators: true,
              emitDecoratorMetadata: true,
            },
          }).outputText;
        },
      },
    ],
  })
);
