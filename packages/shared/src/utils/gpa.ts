import type { GPASubject, GPASemester } from "../types/gpa";

export function sortSemesters(semesters: GPASemester[]): GPASemester[] {
	return [...semesters].sort((a, b) => {
		const numA = parseInt(a.name?.match(/\d+/)?.[0] ?? "0", 10);
		const numB = parseInt(b.name?.match(/\d+/)?.[0] ?? "0", 10);
		if (numA !== numB) return numA - numB;
		return (a.name ?? "").localeCompare(b.name ?? "");
	});
}

export function calculateGPA(subjects: GPASubject[]): string {
	if (!subjects || subjects.length === 0) return "0.00";
	const totalPoints = subjects.reduce((acc, s) => acc + s.grade * s.credit, 0);
	const totalCredits = subjects.reduce((acc, s) => acc + s.credit, 0);
	return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : "0.00";
}

export function calculateCGPA(semesters: GPASemester[]): string {
	if (!semesters || semesters.length === 0) return "0.00";
	return calculateGPA(semesters.flatMap((s) => s.subjects));
}
