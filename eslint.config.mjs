import boundaries from "eslint-plugin-boundaries";
import reactCompiler from "eslint-plugin-react-compiler";
import baseConfig from "./libs/shared/utils-eslint-config/eslint.config.js";
import { reactSourceConfig } from "./libs/shared/utils-eslint-config/react.js";

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
    // Bare `gql` tagged templates (e.g. in **/documents.ts, **/explorerDocuments.ts,
    // **/detailDocuments.ts, **/use*.ts(x)) are intentional side-effectful registrations,
    // not unused expressions. Replaces scattered per-file eslint-disable comments.
    files: ["**/*.{js,mjs,cjs,jsx,ts,tsx}"],
    rules: {
      "no-unused-expressions": ["error", { allowTaggedTemplates: true }],
      "@typescript-eslint/no-unused-expressions": ["error", { allowTaggedTemplates: true }],
    },
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
  {
    plugins: {
      boundaries,
    },
    settings: {
      "boundaries/elements": [
        {
          type: "croco-adapter",
          pattern: "libs/shared/*-croco-adapter/**",
        },
        {
          type: "shared-wrapper",
          pattern: "libs/shared/utils-structure-react/**",
        },
        {
          type: "domain",
          pattern: "**/domain/**",
        },
        {
          type: "feature",
          pattern: "**/feature/**",
        },
        {
          type: "shell",
          pattern: "**/shell/**",
        },
        {
          type: "service",
          pattern: "**/service/**",
        },
        {
          type: "datasource",
          pattern: "**/datasource/**",
        },
        {
          type: "app",
          pattern: "apps/**",
        },
      ],
    },
    rules: {
      "boundaries/entry-point": ["off"],
      // TODO: promote to "error" after scoping the rule with `from` so that ordinary
      // external imports (react, @apollo/client, …) are not flagged. Currently
      // `default: "disallow"` warns on every external import repo-wide (verified via
      // `npx eslint` on sample files), so "error" would break lint everywhere.
      // STAGED ROLLOUT: warn for existing violations → error after consumer migration (T4+)
      "boundaries/external": [
        "warn",
        {
          default: "disallow",
          rules: [
            {
              from: "croco-adapter",
              allow: "@croco/*",
            },
            {
              from: "shared-wrapper",
              allow: "@croco/*",
            },
          ],
          message: "@croco/* 직접 import는 @darun wrapper/adapter를 통해서만 허용됩니다",
        },
      ],
    },
  },
];

export default config;
