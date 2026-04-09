import { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: '../../../apps/graphql-api/schema.graphql',
  documents: [`../../**/*.{ts,tsx}`, `!../../**/__generated__/*.{ts,tsx}`, '!../../**/node_modules/**'],
  generates: {
    '../../libs/': {
      preset: 'near-operation-file',
      config: {
        declarationKind: 'interface',
        namingConvention: 'keep',
        withHooks: true,
        specificHooksReturn: true,
      },
      plugins: ['typescript-operations', 'typescript-react-apollo'],
      presetConfig: {
        baseTypesPath: '~@darun/provider-graphql',
        folder: '__generated__',
        extension: '.ts',
      },
    },
    'src/index.ts': {
      plugins: ['typescript'],
      config: {
        enumsAsTypes: true,
        namingConvention: 'keep',
        immutableTypes: true,
        defaultScalarType: 'unknown',
        scalars: {
          DateTime: 'string',
        },
        useTypeImports: true,
      },
    },
  },
};
export default config;
