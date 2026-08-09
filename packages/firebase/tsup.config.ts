import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm", "cjs"],
	// Declarations are emitted by `tsc --emitDeclarationOnly` in the build script.
	dts: false,
	sourcemap: true,
	clean: true,
	platform: "neutral",
	target: "es2020",
	external: ["firebase", "firebase/firestore", "@bhemu/shared"],
});
