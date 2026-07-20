import { describe, it, expect } from "vitest";
import { calculateGPA, calculateCGPA } from "../src/utils/gpa";
import type { GPASubject, GPASemester } from "../src/types/gpa";

const makeSubject = (grade: number, credit: number): GPASubject => ({
	id: "1",
	subjectName: "Test",
	credit,
	grade,
});

describe("calculateGPA", () => {
	it("returns 0.00 for empty array", () => {
		expect(calculateGPA([])).toBe("0.00");
	});

	it("calculates correctly for single subject", () => {
		expect(calculateGPA([makeSubject(10, 4)])).toBe("10.00");
	});

	it("calculates weighted average", () => {
		const subjects = [makeSubject(10, 4), makeSubject(8, 2)];
		// (10*4 + 8*2) / (4+2) = 56/6 ≈ 9.33
		expect(calculateGPA(subjects)).toBe("9.33");
	});

	it("returns 0.00 for zero total credits", () => {
		expect(calculateGPA([makeSubject(10, 0)])).toBe("0.00");
	});
});

describe("calculateCGPA", () => {
	it("returns 0.00 for empty semesters", () => {
		expect(calculateCGPA([])).toBe("0.00");
	});

	it("aggregates across semesters", () => {
		const sem1: GPASemester = { id: "s1", name: "Sem 1", subjects: [makeSubject(10, 4)] };
		const sem2: GPASemester = { id: "s2", name: "Sem 2", subjects: [makeSubject(8, 4)] };
		// (10*4 + 8*4) / 8 = 9.00
		expect(calculateCGPA([sem1, sem2])).toBe("9.00");
	});
});
