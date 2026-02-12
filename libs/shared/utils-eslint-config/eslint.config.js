import eslintConfigPrettier from "eslint-config-prettier";
import { importX } from "eslint-plugin-import-x";
import packageJson from "eslint-plugin-package-json";
import prettierPlugin from "eslint-plugin-prettier";
import unusedImports from "eslint-plugin-unused-imports";
import jsoncParser from "jsonc-eslint-parser";
import tseslint from "typescript-eslint";

const banTypesCompatRule = {
  meta: {
    type: "problem",
    docs: {
      description: "compatibility alias for removed ban-types rule",
      recommended: false,
    },
    schema: [],
  },
  create() {
    return {};
  },
};

export const typescriptEslintPlugin = {
  ...tseslint.plugin,
  rules: {
    ...tseslint.plugin.rules,
    "ban-types": banTypesCompatRule,
  },
};

export const typescriptEslintRecommendedConfigs =
  tseslint.configs.recommended.map((config) => {
    if (!config.plugins?.["@typescript-eslint"]) {
      return config;
    }

    return {
      ...config,
      plugins: {
        ...config.plugins,
        "@typescript-eslint": typescriptEslintPlugin,
      },
    };
  });

export const sourceFilePatterns = ["**/*.{js,mjs,cjs,jsx,ts,tsx}"];

export const baseSourceConfig = {
  files: sourceFilePatterns,
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
      ecmaVersion: 2018,
      sourceType: "module",
    },
  },
  plugins: {
    prettier: prettierPlugin,
    "import-x": importX,
    "unused-imports": unusedImports,
  },
  rules: {
    "prettier/prettier": [
      "error",
      {
        trailingComma: "es5",
        singleQuote: true,
        printWidth: 120,
        arrowParens: "avoid",
        endOfLine: "lf",
      },
    ],
    "import-x/extensions": ["off"],
    "import-x/no-cycle": ["error"],
    "import-x/no-extraneous-dependencies": ["off"],
    "import-x/no-named-as-default": ["off"],
    "import-x/no-relative-packages": ["off"],
    "import-x/no-self-import": ["error"],
    "import-x/order": [
      "error",
      {
        groups: ["internal", "external", "builtin", "parent", "sibling"],
        pathGroups: [
          {
            pattern: "@*/**",
            group: "internal",
            position: "before",
          },
          {
            pattern: "@*/**",
            group: "external",
            position: "after",
          },
        ],
        pathGroupsExcludedImportTypes: [],
        alphabetize: {
          order: "asc",
          caseInsensitive: true,
        },
      },
    ],
    "import-x/prefer-default-export": ["off"],
    "@typescript-eslint/consistent-type-imports": [
      "error",
      {
        prefer: "no-type-imports",
      },
    ],
    "@typescript-eslint/ban-types": "off",
    "@typescript-eslint/no-empty-object-type": "off",
    "@typescript-eslint/no-unsafe-function-type": "off",
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "unused-imports/no-unused-imports": "error",
  },
  settings: {
    "import-x/parsers": {
      "@typescript-eslint/parser": [".ts"],
    },
  },
};

export const packageJsonConfig = {
  files: ["**/package.json"],
  languageOptions: {
    parser: jsoncParser,
  },
  plugins: {
    "package-json": packageJson,
  },
  rules: {
    "package-json/sort-collections": "error",
  },
};

const baseConfig = [
  {
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
  },
  ...typescriptEslintRecommendedConfigs,
  eslintConfigPrettier,
  baseSourceConfig,
  packageJsonConfig,
  {
    ignores: ["**/__generated__/**"],
  },
];

export default baseConfig;
