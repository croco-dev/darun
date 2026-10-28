import { createDecoratorMetadataPlugin, createNodeConfig } from '@darun/utils-vitest-config';
import ts from 'typescript';
import { defineConfig } from 'vitest/config';

export default defineConfig(
  createNodeConfig({
    esbuild: { keepNames: true },
    plugins: [createDecoratorMetadataPlugin(ts)],
  })
);
