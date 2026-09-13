import { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: '../../../apps/graphql-api/schema.graphql',
  documents: [
    '../../../libs/**/*.{ts,tsx}',
    '../../../apps/admin-web/**/*.{ts,tsx}',
    '../../../apps/service-web/**/*.{ts,tsx}',
    '!../../../libs/**/__generated__/*.{ts,tsx}',
    '!../../../libs/**/node_modules/**',
    '!../../../apps/**/node_modules/**',
    '!../../../apps/service-web/app/api/markdown/**',
    '!../../../apps/service-web/app/sitemap.ts',
  ],
  generates: {
    '../../../libs/__generated__/': {
      preset: 'client',
      config: {
        declarationKind: 'interface',
        namingConvention: 'keep',
        scalars: {
          DateTime: 'string',
          DateTimeISO: 'string',
        },
      },
    },
  },
};
export default config;
