import {
	doc,
	getDoc,
	serverTimestamp,
	writeBatch,
	collection,
	getDocs,
	type Firestore,
} from "firebase/firestore";
import {
	gradeToPoint,
	lookupStandardGrade,
	shouldCreateCutoff,
	createCutoff,
	parseProgram,
	buildGroupKey,
	deriveBatchYear,
} from "@bhemu/shared";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ExamComponent = "ca" | "midTerm" | "endTerm" | "attendanceMarks";

export interface UMSStudentInfo {
	vid: string | null;
	name: string | null;
	program: string | null;
	batchYear: string | null;
	cgpa: string | null;
}

export interface UMSCourse {
	courseCode: string;
	courseName: string;
	grade: string;
	credits?: number;
	termId?: string;
}

export interface UMSTerm {
	id: string;
	displayName: string;
	category: "Regular" | "Reappear" | "RPL" | "Unknown";
	isActive: boolean;
	tgpa?: number | null;
	courses: UMSCourse[];
}

export interface UMSCourseAssessment {
	courseCode: string;
	courseName: string;
	assessmentType: string;
	maximumMarks: number | string;
	marksObtained: number | string;
	weightedMaximumMarks: number | string;
	weightedMarksObtained: number | string;
	isAwaited: boolean;
	termId?: string;
}

export interface UMSAttendanceRecord {
	courseCode: string;
	courseName: string;
	totalLectures: number;
	attendedLectures: number;
	percentage: number;
}

export interface UMSSyncResult {
	studentInfo?: UMSStudentInfo;
	courses: UMSCourse[];
	courseAssessments: UMSCourseAssessment[];
	attendance: UMSAttendanceRecord[];
	terms: UMSTerm[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function mapExamType(examType: string): ExamComponent | null {
	const t = examType.toLowerCase();
	if (t.includes("attendance")) return "attendanceMarks";
	if (t.includes("continuous")) return "ca";
	if (t.includes("mid term")) return "midTerm";
	if (t.includes("end term")) return "endTerm";
	return null;
}

function toWeighted(v: number | string): number {
	return typeof v === "number" ? v : parseFloat(String(v));
}

function computeCustomCutoff(
	total: number,
	umsGradePoint: number
): { gradePoint: number; cutoffMarks: number } | null {
	if (!shouldCreateCutoff(total, umsGradePoint)) return null;
	return createCutoff(total, umsGradePoint);
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function syncGradesAndMarks(
	db: Firestore,
	uid: string,
	data: UMSSyncResult,
	profileId: string
): Promise<void> {
	const batch = writeBatch(db);

	// 1. Write profile metadata
	const profileRef = doc(db, "users", uid, "profiles", String(profileId));
	batch.set(
		profileRef,
		{
			studentInfo: data.studentInfo ?? null,
			umsVerified: true,
			lastUMSSync: new Date().toISOString(),
			updatedAt: serverTimestamp(),
		},
		{ merge: true }
	);

	// 1b. Write leaderboard entry
	const si = data.studentInfo;
	const siBatchYear = deriveBatchYear(si?.vid, si?.batchYear);
	if (si?.cgpa && si?.program && siBatchYear) {
		const parsed = parseProgram(si.program);
		if (parsed) {
			const groupKey = buildGroupKey(siBatchYear, parsed.programCode);
			const leaderboardRef = doc(db, "leaderboard", `${uid}_${profileId}`);
			const existing = await getDoc(leaderboardRef);
			const entry: Record<string, unknown> = {
				userId: uid,
				profileId,
				realName: si.name ?? "Anonymous",
				vid: si.vid ?? "",
				programCode: parsed.programCode,
				programName: parsed.programName,
				branch: parsed.branch,
				batchYear: siBatchYear,
				cgpa: parseFloat(si.cgpa),
				groupKey,
				updatedAt: serverTimestamp(),
			};
			if (!existing.exists()) {
				const profileSnap = await getDoc(profileRef);
				const profileData = profileSnap.data() as { name?: string } | undefined;
				entry.name = profileData?.name ?? si.name ?? "Anonymous";
				entry.optOut = false;
			}
			batch.set(leaderboardRef, entry, { merge: true });
		}
	}

	// Partition terms by category
	const regularTermIds = new Set(
		data.terms.filter((t) => t.category === "Regular").map((t) => t.id)
	);
	const reappearTermIds = new Set(
		data.terms.filter((t) => t.category === "Reappear").map((t) => t.id)
	);

	// 2. Build marks lookup from courseAssessments (Regular terms only)
	const assessmentsByCode = new Map<string, UMSCourseAssessment[]>();
	for (const ca of data.courseAssessments) {
		if (ca.termId && !regularTermIds.has(ca.termId)) continue;
		if (!assessmentsByCode.has(ca.courseCode))
			assessmentsByCode.set(ca.courseCode, []);
		assessmentsByCode.get(ca.courseCode)!.push(ca);
	}

	// 2b. Build ReAppear end-term marks lookup
	const reappearEndByCode = new Map<string, number>();
	for (const ca of data.courseAssessments) {
		if (!ca.termId || !reappearTermIds.has(ca.termId)) continue;
		if (ca.isAwaited) continue;
		const component = mapExamType(ca.assessmentType);
		if (component !== "endTerm") continue;
		const weighted = toWeighted(ca.weightedMarksObtained);
		if (isNaN(weighted)) continue;
		reappearEndByCode.set(
			ca.courseCode,
			(reappearEndByCode.get(ca.courseCode) ?? 0) + weighted
		);
	}

	// 3. Delete all existing gpaAndMarks docs
	const gpaAndMarksRef = collection(
		db,
		"users",
		uid,
		"profiles",
		String(profileId),
		"gpaAndMarks"
	);
	const existingSnap = await getDocs(gpaAndMarksRef);
	for (const existingDoc of existingSnap.docs) {
		batch.delete(existingDoc.ref);
	}

	// 4. Write each Regular semester
	const coursesByTerm = new Map<string, UMSCourse[]>();
	for (const course of data.courses) {
		const tid = course.termId ?? "";
		if (!coursesByTerm.has(tid)) coursesByTerm.set(tid, []);
		coursesByTerm.get(tid)!.push(course);
	}

	for (const term of data.terms) {
		if (term.category !== "Regular") continue;
		let termCourses = coursesByTerm.get(term.id) ?? [];

		// Grades not declared yet — synthesize from assessments
		if (termCourses.length === 0) {
			const seenCodes = new Set<string>();
			const synthetic: UMSCourse[] = [];
			for (const a of data.courseAssessments) {
				if (a.termId !== term.id || seenCodes.has(a.courseCode)) continue;
				seenCodes.add(a.courseCode);
				synthetic.push({
					courseCode: a.courseCode,
					courseName: a.courseName,
					grade: "",
					termId: term.id,
				});
			}
			termCourses = synthetic;
		}

		if (termCourses.length === 0) continue;

		const subjects = termCourses.map((course, i) => {
			const subjectId = `subject_${term.id}_${i}`;
			const umsGrade = course.grade || null;
			const umsGradePoint = umsGrade ? gradeToPoint(umsGrade) : null;

			let ca: number | null = null;
			let midTerm: number | null = null;
			let endTerm: number | null = null;
			let attendanceMarks: number | null = null;

			for (const a of assessmentsByCode.get(course.courseCode) ?? []) {
				if (a.isAwaited) continue;
				const weighted = toWeighted(a.weightedMarksObtained);
				if (isNaN(weighted)) continue;
				const component = mapExamType(a.assessmentType);
				if (component === "ca") ca = (ca ?? 0) + weighted;
				else if (component === "midTerm") midTerm = (midTerm ?? 0) + weighted;
				else if (component === "endTerm") endTerm = (endTerm ?? 0) + weighted;
				else if (component === "attendanceMarks")
					attendanceMarks = (attendanceMarks ?? 0) + weighted;
			}

			// ReAppear override: if reappear end-term beats regular, use it
			const reappearEnd = reappearEndByCode.get(course.courseCode) ?? null;
			if (reappearEnd !== null) {
				const regularExamTotal = (midTerm ?? 0) + (endTerm ?? 0);
				if (reappearEnd > regularExamTotal) {
					midTerm = 0;
					endTerm = reappearEnd;
				}
			}

			const hasAnyMark =
				ca !== null ||
				midTerm !== null ||
				endTerm !== null ||
				attendanceMarks !== null;
			const total = hasAnyMark
				? (ca ?? 0) + (midTerm ?? 0) + (endTerm ?? 0) + (attendanceMarks ?? 0)
				: null;

			const subject: Record<string, unknown> = {
				id: subjectId,
				subjectName:
					course.courseName || course.courseCode || `Subject ${i + 1}`,
				subjectCode: course.courseCode ?? undefined,
				grade:
					umsGradePoint ??
					(total !== null ? lookupStandardGrade(total).gradePoint : 0),
				credit: course.credits ?? 0,
			};

			if (hasAnyMark || umsGradePoint !== null) {
				const cutoff =
					total !== null && umsGradePoint !== null
						? computeCustomCutoff(total, umsGradePoint)
						: null;
				subject.marks = {
					ca,
					midTerm,
					endTerm,
					attendanceMarks,
					total,
					source: "ums",
					umsGradePoint,
					customCutoff: cutoff,
				};
			}

			return subject;
		});

		const semDocRef = doc(
			db,
			"users",
			uid,
			"profiles",
			String(profileId),
			"gpaAndMarks",
			term.id
		);
		batch.set(semDocRef, { id: term.id, name: term.displayName, subjects });
	}

	await batch.commit();
}

export async function syncAttendanceOnly(
	db: Firestore,
	uid: string,
	data: Pick<UMSSyncResult, "attendance">,
	profileId: string
): Promise<void> {
	const subjects: Record<string, unknown> = {};
	for (const record of data.attendance) {
		const id = `att_${record.courseCode}`;
		subjects[id] = {
			id,
			name: record.courseName,
			totalClasses: record.totalLectures,
			attended: record.attendedLectures,
			threshold: 75,
		};
	}

	const mainRef = doc(
		db,
		"users",
		uid,
		"profiles",
		String(profileId),
		"attendanceData",
		"main"
	);
	const batch = writeBatch(db);
	batch.set(
		mainRef,
		{ subjects, defaultThreshold: 75, updatedAt: serverTimestamp() },
		{ merge: true }
	);
	await batch.commit();
}
