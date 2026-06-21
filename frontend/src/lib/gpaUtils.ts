import type { GPASubject, GPASemester } from "@/types";

// Re-export under the local alias names for backward compatibility
export type { GPASubject as Subject, GPASemester as Semester };

export const calculateGPA = (subjects: GPASubject[]): string => {
	if (!subjects || subjects.length === 0) return "0.00";

	const totalPoints = subjects.reduce((acc, subject) => acc + subject.grade * subject.credit, 0);
	const totalCredits = subjects.reduce((acc, subject) => acc + subject.credit, 0);

	return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : "0.00";
};

export const calculateCGPA = (semesters: GPASemester[]): string => {
	if (!semesters || semesters.length === 0) return "0.00";
	const allSubjects = semesters.flatMap((semester) => semester.subjects);
	return calculateGPA(allSubjects);
};

