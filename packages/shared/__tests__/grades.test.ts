import { describe, it, expect } from "vitest";
import { gradeToPoint, pointToGrade } from "../src/utils/grades";
import { GRADE_TABLE, GRADE_TO_POINT, POINT_TO_GRADE, SELECTABLE_GRADES } from "../src/constants/grades";

describe("GRADE_TABLE", () => {
	it("has 11 entries", () => expect(GRADE_TABLE).toHaveLength(11));
	it("O maps to 10", () => expect(GRADE_TO_POINT["O"]).toBe(10));
	it("F maps to 0", () => expect(GRADE_TO_POINT["F"]).toBe(0));
});

describe("SELECTABLE_GRADES", () => {
	it("excludes Incomplete (I)", () => {
		expect(SELECTABLE_GRADES.every((e) => e.grade !== "I")).toBe(true);
	});
	it("has 10 entries", () => expect(SELECTABLE_GRADES).toHaveLength(10));
});

describe("gradeToPoint", () => {
	it("O → 10", () => expect(gradeToPoint("O")).toBe(10));
	it("case insensitive: o → 10", () => expect(gradeToPoint("o")).toBe(10));
	it("unknown grade → 0", () => expect(gradeToPoint("Z")).toBe(0));
});

describe("pointToGrade", () => {
	it("10 → O", () => expect(pointToGrade(10)).toBe("O"));
	it("0 → E (first zero-point grade)", () => expect(POINT_TO_GRADE[0]).toBe("E"));
	it("unknown point → F", () => expect(pointToGrade(11)).toBe("F"));
	it("rounds fractional points", () => expect(pointToGrade(9.6)).toBe("O"));
});
