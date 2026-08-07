import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm", "cjs"],
	// tsup's bundled declaration plugin is not compatible with TypeScript 7.
	// Declarations are emitted by `tsc --emitDeclarationOnly` in the build script.
	dts: false,
	sourcemap: true,
	clean: true,
	platform: "neutral",
	target: "es2020",
});
