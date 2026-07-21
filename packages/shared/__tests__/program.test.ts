import { describe, it, expect } from "vitest";
import { parseProgram, buildGroupKey, formatProgramLabel, deriveBatchYear } from "../src/parsers/program";

describe("parseProgram", () => {
	it("parses B.Tech with branch", () => {
		const result = parseProgram("B.Tech. (Computer Science and Engineering) (P132 )");
		expect(result).toEqual({
			programName: "B.Tech.",
			branch: "Computer Science and Engineering",
			programCode: "P132",
		});
	});

	it("parses program without branch", () => {
		const result = parseProgram("MCA (P164-NN1 )");
		expect(result).toEqual({ programName: "MCA", branch: null, programCode: "P164-NN1" });
	});

	it("returns null for empty/null input", () => {
		expect(parseProgram(null)).toBeNull();
		expect(parseProgram("")).toBeNull();
		expect(parseProgram("No parens here")).toBeNull();
	});
});

describe("buildGroupKey", () => {
	it("joins year and code with underscore", () => {
		expect(buildGroupKey("2024", "P132")).toBe("2024_P132");
	});
});

describe("formatProgramLabel", () => {
	it("returns name + branch when both present", () => {
		expect(formatProgramLabel("B.Tech.", "CSE")).toBe("B.Tech. CSE");
	});
	it("returns name only when no branch", () => {
		expect(formatProgramLabel("MCA", null)).toBe("MCA");
	});
	it("returns fallback when name is null", () => {
		expect(formatProgramLabel(null, null)).toBe("Program");
		expect(formatProgramLabel(null, null, "Unknown")).toBe("Unknown");
	});
});

describe("deriveBatchYear", () => {
	it("uses provided batchYear directly", () => {
		expect(deriveBatchYear("12401984", "2023")).toBe("2023");
	});
	it("derives from VID when batchYear is null", () => {
		expect(deriveBatchYear("12401984", null)).toBe("2024");
	});
	it("returns null for short VID", () => {
		expect(deriveBatchYear("1", null)).toBeNull();
	});
	it("returns null for non-numeric suffix", () => {
		expect(deriveBatchYear("1AB1984", null)).toBeNull();
	});
});
