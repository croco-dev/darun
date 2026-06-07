import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'jsdom',
    passWithNoTests: true,
    include: ['src/__tests__/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
    },
    server: {
      deps: {
        inline: [
          '@darun/products-shell',
          '@croco/utils-structure-react',
          '@darun/ui',
          '@darun/utils-router',
          'next-intl',
        ],
      },
    },
  },
  resolve: {
    alias: {
      'react/jsx-runtime': path.resolve(__dirname, '../../../node_modules/react/jsx-runtime'),
      react: path.resolve(__dirname, '../../../node_modules/react'),
      'react-dom/client': path.resolve(__dirname, '../../../node_modules/react-dom/client'),
      'react-dom': path.resolve(__dirname, '../../../node_modules/react-dom'),
    },
  },
});
