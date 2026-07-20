import { describe, it, expect } from "vitest";
import {
	lookupStandardGrade,
	computeGradeFromMarks,
	computeTotal,
	shouldCreateCutoff,
	createCutoff,
} from "../src/utils/marks";

describe("lookupStandardGrade", () => {
	it("returns O for 95", () => expect(lookupStandardGrade(95).grade).toBe("O"));
	it("returns A+ for 85", () => expect(lookupStandardGrade(85).grade).toBe("A+"));
	it("returns F for 30", () => expect(lookupStandardGrade(30).grade).toBe("F"));
	it("clamps below 0", () => expect(lookupStandardGrade(-5).grade).toBe("F"));
	it("clamps above 100", () => expect(lookupStandardGrade(105).grade).toBe("O"));
});

describe("computeGradeFromMarks", () => {
	it("uses standard table when no cutoff", () => {
		expect(computeGradeFromMarks(85)).toBe(9);
	});

	it("applies custom cutoff (lower bound shifted down)", () => {
		// Standard A+ is 80-89 (gradePoint 9), cutoff at 75 shifts lower bound down
		const cutoff = { gradePoint: 9, cutoffMarks: 75 };
		expect(computeGradeFromMarks(77, cutoff)).toBe(9);
	});

	it("falls back to standard table when outside custom range", () => {
		const cutoff = { gradePoint: 9, cutoffMarks: 75 };
		expect(computeGradeFromMarks(70, cutoff)).toBe(8); // standard A
	});
});

describe("computeTotal", () => {
	it("returns null when all inputs are null", () => {
		expect(computeTotal(null, null, null, null)).toBeNull();
	});

	it("sums non-null values, treats null as 0", () => {
		expect(computeTotal(20, 15, 40, null)).toBe(75);
	});

	it("clamps negative values to 0", () => {
		expect(computeTotal(-5, 10, 20, 5)).toBe(35);
	});
});

describe("shouldCreateCutoff", () => {
	it("returns false when umsGradePoint is 0", () => {
		expect(shouldCreateCutoff(85, 0)).toBe(false);
	});

	it("returns false when standard grade matches UMS", () => {
		expect(shouldCreateCutoff(85, 9)).toBe(false); // 85 → A+ = 9
	});

	it("returns true when standard grade differs from UMS", () => {
		expect(shouldCreateCutoff(75, 9)).toBe(true); // 75 → A = 8, UMS says 9
	});
});

describe("createCutoff", () => {
	it("creates cutoff with given values", () => {
		expect(createCutoff(75, 9)).toEqual({ gradePoint: 9, cutoffMarks: 75 });
	});
});
