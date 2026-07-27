import { collection, getDocs } from 'firebase/firestore';
import { getFirebaseDb, getCurrentUser } from '~lib/firebase';
import { syncGradesAndMarks as syncGradesAndMarksShared, syncAttendanceOnly as syncAttendanceOnlyShared } from '@bhemu/firebase';
import type { UMSSyncResult } from '@bhemu/firebase';
import type { SyncResult } from '~lib/types';

function toShared(data: SyncResult): UMSSyncResult {
  return {
    studentInfo: data.studentInfo,
    courses: data.courses,
    courseAssessments: data.courseAssessments,
    attendance: data.attendance,
    terms: data.terms,
  };
}

export async function syncGradesAndMarks(data: SyncResult, profileId: string): Promise<void> {
  const db = getFirebaseDb();
  const user = await getCurrentUser();
  if (!user) throw new Error('Not signed in to bCampus. Please open the app and sign in first.');
  await syncGradesAndMarksShared(db, user.uid, toShared(data), profileId);
}

export async function syncAttendanceOnly(data: Pick<SyncResult, 'attendance'>, profileId: string): Promise<void> {
  const db = getFirebaseDb();
  const user = await getCurrentUser();
  if (!user) throw new Error('Not signed in to bCampus. Please open the app and sign in first.');
  await syncAttendanceOnlyShared(db, user.uid, { attendance: data.attendance }, profileId);
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
    .filter((p) => p.name);

  profiles.sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return a.name.localeCompare(b.name);
  });

  return profiles.map(({ id, name }) => ({ id, name }));
}
