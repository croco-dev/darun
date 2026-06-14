const { defineConfig } = require('drizzle-kit');

module.exports = defineConfig({
  dialect: 'postgresql',
  schema: [
    '../../libs/accounts/datasource/src/entities/ProfileSchema.ts',
    '../../libs/companies/datasource/src/entities/CompanySchema.ts',
    '../../libs/magazines/datasource/src/entities/MagazineSchema.ts',
    '../../libs/products/datasource/src/entities/*.ts',
    '../../libs/recommendation/datasource/src/entities/AlternativeProductSchema.ts',
    '../../libs/translation/datasource/src/entities/TranslationSchema.ts',
    '../../libs/voting/datasource/src/entities/*.ts',
  ],
  out: './scripts/migrations',
});
