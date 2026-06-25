import {
  doc,
  serverTimestamp,
  writeBatch,
  collection,
  getDocs,
} from 'firebase/firestore';
import { getFirebaseDb, getCurrentUser } from '~lib/firebase';
import { mapExamType } from '~utils/examTypes';
import type { SyncResult, Course } from '~lib/types';

const GRADE_POINT_MAP: Record<string, number> = {
  O: 10, 'A+': 9, A: 8, 'B+': 7, B: 6, C: 5, D: 4, P: 4, F: 0, G: 0, E: 0, I: 0,
};

const STANDARD_GRADE_TABLE = [
  { minMarks: 90, maxMarks: 100, gradePoint: 10 },
  { minMarks: 80, maxMarks: 89, gradePoint: 9 },
  { minMarks: 70, maxMarks: 79, gradePoint: 8 },
  { minMarks: 60, maxMarks: 69, gradePoint: 7 },
  { minMarks: 50, maxMarks: 59, gradePoint: 6 },
  { minMarks: 45, maxMarks: 49, gradePoint: 5 },
  { minMarks: 40, maxMarks: 44, gradePoint: 4 },
  { minMarks: 0, maxMarks: 39, gradePoint: 0 },
];

function gradeToPoint(grade: string): number {
  return GRADE_POINT_MAP[grade?.toUpperCase()] ?? 0;
}

function toWeighted(v: number | string): number {
  return typeof v === 'number' ? v : parseFloat(String(v));
}

function standardGradePoint(totalMarks: number): number {
  const clamped = Math.max(0, Math.min(100, totalMarks));
  return STANDARD_GRADE_TABLE.find((e) => clamped >= e.minMarks && clamped <= e.maxMarks)?.gradePoint ?? 0;
}

function computeCustomCutoff(total: number, umsGradePoint: number): { gradePoint: number; cutoffMarks: number } | null {
  if (umsGradePoint === 0) return null;
  if (standardGradePoint(total) === umsGradePoint) return null;
  return { gradePoint: umsGradePoint, cutoffMarks: total };
}


/**
 * Sync grades + marks into the selected profile.
 * Writes to:
 *   users/{uid}/profiles/{pid}                          → metadata only (studentInfo, umsVerified, lastUMSSync)
 *   users/{uid}/profiles/{pid}/gpaAndMarks/{termId}     → one doc per semester, marks embedded in subjects
 */
export async function syncGradesAndMarks(data: SyncResult, profileId: string): Promise<void> {
  const db = getFirebaseDb();
  const user = await getCurrentUser();
  if (!user) throw new Error('Not signed in to Bhemu Calculator. Please open the app and sign in first.');

  const uid = user.uid;
  const batch = writeBatch(db);

  // ----- 1. Write profile metadata only (no semesters array) -----
  const profileRef = doc(db, 'users', uid, 'profiles', profileId);
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

  // Partition terms by category
  const regularTermIds = new Set(data.terms.filter(t => t.category === 'Regular').map(t => t.id));
  const reappearTermIds = new Set(data.terms.filter(t => t.category === 'Reappear').map(t => t.id));

  // ----- 2. Build marks lookup from courseAssessments (Regular terms only) -----
  const assessmentsByCode = new Map<string, typeof data.courseAssessments>();
  for (const ca of data.courseAssessments) {
    if (ca.termId && !regularTermIds.has(ca.termId)) continue;
    if (!assessmentsByCode.has(ca.courseCode)) assessmentsByCode.set(ca.courseCode, []);
    assessmentsByCode.get(ca.courseCode)!.push(ca);
  }

  // ----- 2b. Build ReAppear end-term marks lookup -----
  // ReAppear exams cover the full exam (mid+end territory). We sum all end-type weighted marks per course.
  const reappearEndByCode = new Map<string, number>();
  for (const ca of data.courseAssessments) {
    if (!ca.termId || !reappearTermIds.has(ca.termId)) continue;
    if (ca.isAwaited) continue;
    const component = mapExamType(ca.assessmentType);
    if (component !== 'endTerm') continue;
    const weighted = toWeighted(ca.weightedMarksObtained);
    if (isNaN(weighted)) continue;
    reappearEndByCode.set(ca.courseCode, (reappearEndByCode.get(ca.courseCode) ?? 0) + weighted);
  }

  // ----- 3. Delete all existing gpaAndMarks docs before writing fresh ones -----
  // This ensures old manually-added or stale semesters don't persist alongside synced data.
  const gpaAndMarksRef = collection(db, 'users', uid, 'profiles', profileId, 'gpaAndMarks');
  const existingSnap = await getDocs(gpaAndMarksRef);
  for (const existingDoc of existingSnap.docs) {
    batch.delete(existingDoc.ref);
  }

  // ----- 4. Write each Regular semester as a doc in gpaAndMarks subcollection -----
  // term.courses is always empty — courses are in data.courses with a termId field.
  // Build a map: termId → courses for O(1) lookup.
  const coursesByTerm = new Map<string, typeof data.courses>();
  for (const course of data.courses) {
    const tid = course.termId ?? '';
    if (!coursesByTerm.has(tid)) coursesByTerm.set(tid, []);
    coursesByTerm.get(tid)!.push(course);
  }

  for (const term of data.terms) {
    if (term.category !== 'Regular') continue;
    let termCourses = coursesByTerm.get(term.id) ?? [];

    // Grades not declared yet — synthesize course list from assessments so marks still get written
    if (termCourses.length === 0) {
      const seenCodes = new Set<string>();
      const synthetic: typeof data.courses = [];
      for (const a of data.courseAssessments) {
        if (a.termId !== term.id || seenCodes.has(a.courseCode)) continue;
        seenCodes.add(a.courseCode);
        synthetic.push({ courseCode: a.courseCode, courseName: a.courseName, grade: '', termId: term.id });
      }
      termCourses = synthetic;
    }

    if (termCourses.length === 0) continue;

    const subjects = termCourses.map((course: Course, i: number) => {
      const subjectId = `subject_${term.id}_${i}`;
      const umsGrade = course.grade || null;
      const umsGradePoint = umsGrade ? gradeToPoint(umsGrade) : null;

      // Build marks from courseAssessments using weightedMarksObtained (always totals to 100)
      let ca: number | null = null;
      let midTerm: number | null = null;
      let endTerm: number | null = null;
      let attendanceMarks: number | null = null;

      // Fill from courseAssessments using weightedMarksObtained (always totals to 100)
      // Multiple components of same type (e.g. Theory End Term + Objective End Term) are summed.
      const assessments = assessmentsByCode.get(course.courseCode) ?? [];
      for (const a of assessments) {
        if (a.isAwaited) continue;
        const weighted = toWeighted(a.weightedMarksObtained);
        if (isNaN(weighted)) continue;
        const component = mapExamType(a.assessmentType);
        if (component === 'ca') ca = (ca ?? 0) + weighted;
        else if (component === 'midTerm') midTerm = (midTerm ?? 0) + weighted;
        else if (component === 'endTerm') endTerm = (endTerm ?? 0) + weighted;
        else if (component === 'attendanceMarks') attendanceMarks = (attendanceMarks ?? 0) + weighted;
      }

      // ----- ReAppear override -----
      // If this course has a reappear end-term mark that beats the regular exam score,
      // use the reappear mark as end-term and zero out mid-term (reappear covers both).
      const reappearEnd = reappearEndByCode.get(course.courseCode) ?? null;
      if (reappearEnd !== null) {
        const regularExamTotal = (midTerm ?? 0) + (endTerm ?? 0);
        if (reappearEnd > regularExamTotal) {
          midTerm = 0;
          endTerm = reappearEnd;
        }
        // else: regular marks are better — keep them unchanged
      }

      const hasAnyMark = ca !== null || midTerm !== null || endTerm !== null || attendanceMarks !== null;
      const total = hasAnyMark
        ? (ca ?? 0) + (midTerm ?? 0) + (endTerm ?? 0) + (attendanceMarks ?? 0)
        : null;

      const subject: Record<string, unknown> = {
        id: subjectId,
        subjectName: course.courseName || course.courseCode || `Subject ${i + 1}`,
        subjectCode: course.courseCode ?? undefined,
        grade: umsGradePoint ?? (total !== null ? standardGradePoint(total) : 0),
        credit: course.credits ?? 3,
      };

      if (hasAnyMark || umsGradePoint !== null) {
        const cutoff = (total !== null && umsGradePoint !== null)
          ? computeCustomCutoff(total, umsGradePoint)
          : null;

        subject.marks = {
          ca,
          midTerm,
          endTerm,
          attendanceMarks,
          total,
          source: 'ums',
          umsGradePoint,
          customCutoff: cutoff,
        };
      }

      return subject;
    });

    const semDocRef = doc(db, 'users', uid, 'profiles', profileId, 'gpaAndMarks', term.id);
    batch.set(semDocRef, { id: term.id, name: term.displayName, subjects });
  }

  await batch.commit();
}

/**
 * Sync attendance only into the selected profile.
 * Writes all subjects (across all terms) to a single flat doc:
 *   users/{uid}/profiles/{pid}/attendanceData/main
 */
export async function syncAttendanceOnly(data: Pick<SyncResult, 'attendance'>, profileId: string): Promise<void> {
  const db = getFirebaseDb();
  const user = await getCurrentUser();
  if (!user) throw new Error('Not signed in to Bhemu Calculator. Please open the app and sign in first.');

  const uid = user.uid;

  // Merge all attendance records across terms into one subjects map.
  // Key by courseCode so duplicates across terms are deduplicated (last wins).
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

  const mainRef = doc(db, 'users', uid, 'profiles', profileId, 'attendanceData', 'main');
  const batch = writeBatch(db);
  batch.set(
    mainRef,
    { subjects, defaultThreshold: 75, updatedAt: serverTimestamp() },
    { merge: true }
  );
  await batch.commit();
}

/**
 * Load all profiles for the current user from Firestore.
 * Returns array of { id, name } for the profile selector.
 */
export async function loadUserProfiles(): Promise<Array<{ id: string; name: string }>> {
  const db = getFirebaseDb();
  const user = await getCurrentUser();
  if (!user) return [];

  const profilesRef = collection(db, 'users', user.uid, 'profiles');
  const snap = await getDocs(profilesRef);
  const profiles = snap.docs
    .map((d) => {
      const data = d.data() as { name?: string; isDefault?: boolean };
      return { id: d.id, name: data.name ?? d.id, isDefault: !!data.isDefault };
    })
    .filter((p) => p.name); // exclude ghost docs (no name)

  profiles.sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return a.name.localeCompare(b.name);
  });

  return profiles.map(({ id, name }) => ({ id, name }));
}
