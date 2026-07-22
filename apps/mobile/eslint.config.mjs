import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
	{
		ignores: [".expo/", "node_modules/", "expo-env.d.ts"],
	},

	js.configs.recommended,
	...tseslint.configs.recommended,

	{
		files: ["src/**/*.{ts,tsx}"],
		plugins: {
			"react-hooks": reactHooks,
		},
		languageOptions: {
			globals: {
				...globals.browser,
				__DEV__: "readonly",
				fetch: "readonly",
				FormData: "readonly",
				XMLHttpRequest: "readonly",
				AbortController: "readonly",
			},
			parserOptions: {
				project: "./tsconfig.json",
			},
		},
		rules: {
			// Enforces rules of hooks + catches missing useEffect deps
			...reactHooks.configs.recommended.rules,

			// TypeScript
			"@typescript-eslint/no-unused-vars": [
				"warn",
				{
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
					destructuredArrayIgnorePattern: "^_",
				},
			],
			"@typescript-eslint/no-explicit-any": "warn",
			"@typescript-eslint/no-require-imports": "off",
			"@typescript-eslint/no-shadow": "warn",

			// Quality
			"no-shadow": "off", // use @typescript-eslint/no-shadow instead
			"no-console": ["warn", { allow: ["warn", "error"] }],
			"eqeqeq": ["error", "always", { null: "ignore" }],
		},
	}
);
