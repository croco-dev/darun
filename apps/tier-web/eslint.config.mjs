import reactConfig from '@darun/eslint-config/react';
import reactCompiler from 'eslint-plugin-react-compiler';

export default [
  ...reactConfig,
  {
    files: ['**/*.{js,mjs,cjs,jsx,ts,tsx}'],
    ...reactCompiler.configs.recommended,
  },
  {
    ignores: ['.next/**', '.open-next/**', '.wrangler/**', 'cloudflare-env.d.ts', 'next-env.d.ts', 'coverage/**'],
  },
];
