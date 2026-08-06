// ============================================================
// bCampus Chat Worker — Vitest Configuration
// ============================================================
import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
	resolve: {
		alias: {
			"@src": resolve(__dirname, "src"),
			"@test": resolve(__dirname, "test"),
		},
	},
	test: {
		globals: true,
		environment: "node",
		setupFiles: ["test/helpers/setup.ts"],
		projects: [
			{
				test: {
					name: "unit",
					include: ["test/unit/**/*.test.ts"],
					environment: "node",
				},
			},
			{
				test: {
					name: "integration",
					include: ["test/integration/**/*.test.ts"],
					environment: "node",
					pool: "forks",
					poolOptions: { forks: { singleFork: true } },
					testTimeout: 30_000,
					// Load .env for DATABASE_URL
					env: (() => {
						const dotenv = require("dotenv");
						const result = dotenv.config({ path: ".env" });
						return result.parsed ?? {};
					})(),
				},
			},
			{
				test: {
					name: "e2e",
					include: ["test/e2e/**/*.test.ts"],
					environment: "node",
					testTimeout: 60_000,
					env: (() => {
						const dotenv = require("dotenv");
						const result = dotenv.config({ path: ".env.test" });
						return result.parsed ?? {};
					})(),
				},
			},
		],
	},
});
