import {
  doc,
  serverTimestamp,
  writeBatch,
  collection,
  getDocs,
} from 'firebase/firestore';
import { getFirebaseDb, getCurrentUser } from '~lib/firebase';
import type { SyncResult, AttendanceRecord, ExamMark, CourseAssessment, Course } from '~lib/types';

const GRADE_POINT_MAP: Record<string, number> = {
  O: 10, 'A+': 9, A: 8, 'B+': 7, B: 6, C: 5, D: 4, P: 4, F: 0, G: 0, E: 0, I: 0,
};

function gradeToPoint(grade: string): number {
  return GRADE_POINT_MAP[grade?.toUpperCase()] ?? 0;
}

// Determine exam marks component type from UMS examType string
function mapExamType(examType: string): 'ca' | 'midTerm' | 'endTerm' | 'attendanceMarks' | null {
  const t = examType.toLowerCase();
  if (t.includes('ca') || t.includes('continuous') || t.includes('assignment')) return 'ca';
  if (t.includes('mid')) return 'midTerm';
  if (t.includes('end') || t.includes('final') || t.includes('theory')) return 'endTerm';
  if (t.includes('att') || t.includes('attendance')) return 'attendanceMarks';
  return null;
}

/**
 * Sync grades + marks (courses, examMarks, courseAssessments) into the selected profile.
 * Writes to:
 *   users/{uid}/profiles/{pid}                     → semesters array (GPA data)
 *   users/{uid}/profiles/{pid}/marksData/{termId}  → marks per term
 */
export async function syncGradesAndMarks(data: SyncResult, profileId: string): Promise<void> {
  const db = getFirebaseDb();
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const uid = user.uid;
  const batch = writeBatch(db);

  // ----- 1. Build GPA semesters from courses -----
  const semesterMap = new Map<string, { id: string; name: string; subjects: unknown[] }>();
  for (const term of data.terms) {
    semesterMap.set(term.id, {
      id: term.id,
      name: term.displayName,
      subjects: term.courses.map((c: Course, i: number) => ({
        id: `subject_${term.id}_${i}`,
        subjectName: c.courseName || c.courseCode || `Subject ${i + 1}`,
        grade: gradeToPoint(c.grade),
        credit: c.credits ?? 3,
      })),
    });
  }

  const semesters = Array.from(semesterMap.values()).filter((s) => s.subjects.length > 0);
  const profileRef = doc(db, 'users', uid, 'profiles', profileId);
  batch.set(
    profileRef,
    {
      semesters,
      studentInfo: data.studentInfo ?? null,
      umsVerified: true,
      lastUMSSync: new Date().toISOString(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  // ----- 2. Build marks data per term -----
  // Group examMarks by termId
  const examMarksByTerm = new Map<string, ExamMark[]>();
  for (const em of data.examMarks) {
    const tid = em.termId ?? 'unknown';
    if (!examMarksByTerm.has(tid)) examMarksByTerm.set(tid, []);
    examMarksByTerm.get(tid)!.push(em);
  }

  // Group courseAssessments by courseCode
  const assessmentsByCode = new Map<string, CourseAssessment[]>();
  for (const ca of data.courseAssessments) {
    if (!assessmentsByCode.has(ca.courseCode)) assessmentsByCode.set(ca.courseCode, []);
    assessmentsByCode.get(ca.courseCode)!.push(ca);
  }

  for (const term of data.terms) {
    if (term.courses.length === 0) continue;
    const termMarks: Record<string, unknown> = {};

    for (let i = 0; i < term.courses.length; i++) {
      const course = term.courses[i];
      const subjectId = `subject_${term.id}_${i}`;
      const umsGrade = course.grade || null;
      const umsGradePoint = umsGrade ? gradeToPoint(umsGrade) : null;

      // Map examMarks to ca/midTerm/endTerm/attendanceMarks
      let ca: number | null = null;
      let midTerm: number | null = null;
      let endTerm: number | null = null;
      let attendanceMarks: number | null = null;

      const termExams = examMarksByTerm.get(term.id) ?? [];
      for (const em of termExams) {
        if (em.courseCode !== course.courseCode) continue;
        const component = mapExamType(em.examType);
        if (component === 'ca') ca = em.obtainedMarks;
        else if (component === 'midTerm') midTerm = em.obtainedMarks;
        else if (component === 'endTerm') endTerm = em.obtainedMarks;
        else if (component === 'attendanceMarks') attendanceMarks = em.obtainedMarks;
      }

      // Also try courseAssessments for more granular data
      const assessments = assessmentsByCode.get(course.courseCode) ?? [];
      for (const a of assessments) {
        if (a.isAwaited) continue;
        const obtained = typeof a.marksObtained === 'number' ? a.marksObtained : parseFloat(String(a.marksObtained));
        if (isNaN(obtained)) continue;
        const component = mapExamType(a.assessmentType);
        if (component === 'ca' && ca === null) ca = obtained;
        else if (component === 'midTerm' && midTerm === null) midTerm = obtained;
        else if (component === 'endTerm' && endTerm === null) endTerm = obtained;
        else if (component === 'attendanceMarks' && attendanceMarks === null) attendanceMarks = obtained;
      }

      const total =
        ca !== null || midTerm !== null || endTerm !== null || attendanceMarks !== null
          ? (ca ?? 0) + (midTerm ?? 0) + (endTerm ?? 0) + (attendanceMarks ?? 0)
          : null;

      termMarks[subjectId] = {
        id: subjectId,
        courseCode: course.courseCode,
        courseName: course.courseName,
        credit: course.credits ?? 3,
        ca,
        midTerm,
        endTerm,
        attendanceMarks,
        total,
        source: umsGrade ? 'ums' : total !== null ? 'manual' : 'partial',
        umsGrade,
        umsGradePoint,
        computedGradePoint: umsGradePoint,
        customCutoff: null, // cutoff detection happens on the frontend
      };
    }

    const marksDocRef = doc(db, 'users', uid, 'profiles', profileId, 'marksData', term.id);
    batch.set(
      marksDocRef,
      { subjects: termMarks, updatedAt: serverTimestamp(), lastModifiedBy: 'ums' },
      { merge: true }
    );
  }

  await batch.commit();
}

/**
 * Sync attendance only into the selected profile.
 * Writes to: users/{uid}/profiles/{pid}/attendanceData/{termId}
 */
export async function syncAttendanceOnly(data: SyncResult, profileId: string): Promise<void> {
  const db = getFirebaseDb();
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const uid = user.uid;
  const batch = writeBatch(db);

  // Group attendance by termId
  const attendanceByTerm = new Map<string, AttendanceRecord[]>();
  for (const a of data.attendance) {
    const tid = a.termId ?? 'unknown';
    if (!attendanceByTerm.has(tid)) attendanceByTerm.set(tid, []);
    attendanceByTerm.get(tid)!.push(a);
  }

  for (const [termId, records] of attendanceByTerm) {
    const subjects: Record<string, unknown> = {};
    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const id = `att_${termId}_${i}`;
      subjects[id] = {
        id,
        courseCode: r.courseCode,
        courseName: r.courseName,
        totalClasses: r.totalLectures,
        attended: r.attendedLectures,
        percentage: r.percentage,
        threshold: 75,
      };
    }

    const attDocRef = doc(db, 'users', uid, 'profiles', profileId, 'attendanceData', termId);
    batch.set(
      attDocRef,
      { subjects, defaultThreshold: 75, updatedAt: serverTimestamp(), lastModifiedBy: 'ums' },
      { merge: true }
    );
  }

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
  const profiles = snap.docs.map((d) => {
    const data = d.data() as { name?: string; isDefault?: boolean };
    return { id: d.id, name: data.name ?? d.id, isDefault: !!data.isDefault };
  });

  // Default profile first, then alphabetical
  profiles.sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return a.name.localeCompare(b.name);
  });

  return profiles.map(({ id, name }) => ({ id, name }));
}
