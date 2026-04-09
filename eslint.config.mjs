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
];

export default config;
