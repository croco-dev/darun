import baseConfig from "./libs/shared/utils-eslint-config/eslint.config.js";
import { reactSourceConfig } from "./libs/shared/utils-eslint-config/react.js";
import boundaries from "eslint-plugin-boundaries";
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
    rules: {
      "@typescript-eslint/consistent-type-imports": "off",
    },
  },
  {
    files: reactFilePatterns,
    ...reactSourceConfig,
  },
  {
    files: reactFilePatterns,
    ...reactCompiler.configs.recommended,
  },
  {
    ignores: ["libs/shared/provider-graphql/src/index.ts"],
  },
  {
    plugins: {
      boundaries,
    },
    rules: {
      "boundaries/element-types": [
        "error",
        {
          default: "disallow",
          rules: [
            {
              from: "domain",
              to: "domain",
              disallow: ["*"],
              message: "domain에서 다른 domain으로 직접 참조 금지",
            },
            {
              from: "feature",
              to: "feature",
              disallow: ["*"],
              message: "feature에서 다른 feature로 직접 참조 금지",
            },
            {
              from: "shell",
              to: "shell",
              allow: ["*"],
            },
          ],
        },
      ],
    },
  },
  {
    plugins: {
      boundaries,
    },
    // STAGED ROLLOUT POLICY (T13):
    // - Phase 1: warn로 시작 (T2+T7 완료 후)
    // - Phase 2 (현재): violations 0건 확인 → error 승격 완료
    // - Phase 3 (예정): domain→service/datasource 규칙 추가 검토
    rules: {
      "boundaries/element-types": [
        "error",
        {
          default: "disallow",
          rules: [
            {
              from: "feature",
              to: "service",
              disallow: ["*"],
              message: "feature에서 타 도메인의 service 레이어로 직접 참조 - orchestration 경계 위반",
            },
            {
              from: "feature",
              to: "datasource",
              disallow: ["*"],
              message: "feature에서 타 도메인의 datasource 레이어로 직접 참조 - orchestration 경계 위반",
            },
          ],
        },
      ],
    },
  },
];

export default config;
