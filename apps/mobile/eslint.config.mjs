import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import rnPlugin from "@react-native/eslint-plugin";
import tseslint from "typescript-eslint";

export default defineConfig([
	// Ignore generated artifacts
	{ ignores: [".expo/", "node_modules/", "expo-env.d.ts"] },

	// Base JS + TypeScript
	js.configs.recommended,
	...tseslint.configs.recommended,

	// Node.js globals for root Expo/Metro config files
	{
		files: ["babel.config.js", "metro.config.js", "app.config.js"],
		languageOptions: { globals: globals.node },
	},

	// App source
	{
		files: ["src/**/*.{ts,tsx}"],
		plugins: {
			"react-hooks": reactHooks,
			"@react-native": rnPlugin,
		},
		languageOptions: {
			globals: {
				// React Native runtime globals (not browser, not Node)
				__DEV__: "readonly",
				fetch: "readonly",
				FormData: "readonly",
				AbortController: "readonly",
				requestAnimationFrame: "readonly",
				cancelAnimationFrame: "readonly",
				performance: "readonly",
			},
			parserOptions: {
				project: "./tsconfig.json",
			},
		},
		rules: {
			// React Hooks — rules of hooks + exhaustive deps (catches missing useEffect deps)
			...reactHooks.configs.recommended.rules,

			// Official RN plugin — actively maintained alongside RN core
			"@react-native/platform-colors": "warn", // flag platform-specific color values used cross-platform
			"@react-native/no-deep-imports": "warn",  // flag deep internal imports from RN (can break on upgrades)

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
			"@typescript-eslint/no-require-imports": "off", // RN uses require() for asset imports (images, fonts)
			"@typescript-eslint/no-shadow": "warn",

			// General quality
			"no-shadow": "off",                                       // use @typescript-eslint/no-shadow instead
			"no-console": ["warn", { allow: ["warn", "error"] }],     // allow console.warn/error, flag console.log
			"eqeqeq": ["error", "always", { null: "ignore" }],
		},
	},
]);
