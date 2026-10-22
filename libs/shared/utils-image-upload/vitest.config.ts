import { createNodeConfig, defineConfig } from '@darun/utils-vitest-config';

export default defineConfig(createNodeConfig({ test: { passWithNoTests: false } }));
