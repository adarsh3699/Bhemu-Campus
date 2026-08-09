import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm", "cjs"],
	// Declarations are emitted by `tsc --emitDeclarationOnly` in the build script.
	dts: false,
	sourcemap: true,
	clean: true,
	platform: "neutral",  // works in both browser and React Native
	target: "es2020",
});
