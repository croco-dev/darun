import { createJsdomConfig, defineConfig } from '@darun/utils-vitest-config';
import { fileURLToPath } from 'node:url';

export default defineConfig(
  createJsdomConfig({
    esbuild: { jsx: 'automatic' },
    test: {
      setupFiles: [
        fileURLToPath(
          new URL('../../utils-auth-service/firebase/src/__tests__/firebaseSdk.fixture.ts', import.meta.url)
        ),
      ],
    },
  })
);
