import baseConfig from "./libs/shared/utils-eslint-config/eslint.config.js";
import { reactSourceConfig } from "./libs/shared/utils-eslint-config/react.js";
import reactCompiler from "eslint-plugin-react-compiler";

const reactFilePatterns = [
  "libs/admin/**/*.{js,mjs,cjs,jsx,ts,tsx}",
  "libs/shared/provider-auth/client/**/*.{js,mjs,cjs,jsx,ts,tsx}",
  "libs/shared/provider-auth/server/**/*.{js,mjs,cjs,jsx,ts,tsx}",
  "libs/shared/utils-apollo-client/client/**/*.{js,mjs,cjs,jsx,ts,tsx}",
  "libs/shared/utils-apollo-client/server/**/*.{js,mjs,cjs,jsx,ts,tsx}",
];

const config = [
  ...baseConfig,
  {
    ...reactSourceConfig,
    files: reactFilePatterns,
  },
  {
    files: reactFilePatterns,
    ...reactCompiler.configs.recommended,
  },
  {
    ignores: ["libs/shared/provider-graphql/src/index.ts"],
  },
];

export default config;
