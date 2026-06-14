import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'jsdom',
    passWithNoTests: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
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
