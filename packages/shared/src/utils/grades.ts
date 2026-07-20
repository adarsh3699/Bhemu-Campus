import { GRADE_TO_POINT, POINT_TO_GRADE } from "../constants/grades";

export function gradeToPoint(grade: string): number {
	return GRADE_TO_POINT[grade.toUpperCase()] ?? 0;
}

export function pointToGrade(gradePoint: number): string {
	return POINT_TO_GRADE[Math.round(gradePoint)] ?? "F";
}
