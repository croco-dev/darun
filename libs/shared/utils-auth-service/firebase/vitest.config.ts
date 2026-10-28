import { createJsdomConfig, defineConfig } from '@darun/utils-vitest-config';

export default defineConfig(createJsdomConfig({ esbuild: { jsx: 'automatic' } }));
