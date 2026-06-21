// Re-exports Firebase sync functions as the public sync API.
// Previously contained Supabase sync logic — migrated to Firebase.
export { syncGradesAndMarks, syncAttendanceOnly } from '~lib/firebaseSync';
