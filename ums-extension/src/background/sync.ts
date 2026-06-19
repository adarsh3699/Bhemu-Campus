import { getSupabase } from '~lib/supabase';
import type { SyncResult } from '~lib/types';

export async function syncToSupabase(data: SyncResult): Promise<void> {
  const supabase = getSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated to Supabase');

  const userId = user.id;

  // Upsert profile
  if (data.studentInfo) {
    await supabase.from('profiles').upsert({
      id: userId,
      vid: data.studentInfo.vid,
      name: data.studentInfo.name,
      program: data.studentInfo.program,
      batch_year: data.studentInfo.batchYear,
      cgpa: data.studentInfo.cgpa,
      last_synced_at: new Date().toISOString(),
    });
  }

  // Upsert terms
  if (data.terms.length > 0) {
    await supabase.from('terms').upsert(
      data.terms.map(t => ({
        user_id: userId,
        term_id: t.id,
        display_name: t.displayName,
        category: t.category,
        tgpa: t.tgpa ?? null,
        is_active: t.isActive,
      })),
      { onConflict: 'user_id,term_id' }
    );
  }

  // Upsert courses
  if (data.courses.length > 0) {
    await supabase.from('courses').upsert(
      data.courses.map(c => ({
        user_id: userId,
        term_id: c.termId ?? '',
        course_code: c.courseCode,
        course_name: c.courseName,
        grade: c.grade,
        credits: c.credits ?? null,
      })),
      { onConflict: 'user_id,course_code,term_id' }
    );
  }

  // Upsert exam marks
  if (data.examMarks.length > 0) {
    await supabase.from('exam_marks').upsert(
      data.examMarks.map(e => ({
        user_id: userId,
        term_id: e.termId ?? '',
        course_code: e.courseCode,
        course_name: e.courseName,
        exam_type: e.examType,
        exam_date: e.examDate ?? null,
        max_marks: e.maxMarks,
        obtained_marks: e.obtainedMarks,
      })),
      { onConflict: 'user_id,course_code,exam_type,term_id' }
    );
  }

  // Upsert course assessments
  if (data.courseAssessments.length > 0) {
    await supabase.from('course_assessments').upsert(
      data.courseAssessments.map(a => ({
        user_id: userId,
        course_code: a.courseCode,
        assessment_type: a.assessmentType,
        max_marks: typeof a.maximumMarks === 'number' ? a.maximumMarks : null,
        obtained_marks: typeof a.marksObtained === 'number' ? a.marksObtained : null,
        weighted_max: typeof a.weightedMaximumMarks === 'number' ? a.weightedMaximumMarks : null,
        weighted_obtained: typeof a.weightedMarksObtained === 'number' ? a.weightedMarksObtained : null,
        is_awaited: a.isAwaited,
      })),
      { onConflict: 'user_id,course_code,assessment_type' }
    );
  }

  // Upsert attendance
  if (data.attendance.length > 0) {
    await supabase.from('attendance').upsert(
      data.attendance.map(a => ({
        user_id: userId,
        course_code: a.courseCode,
        course_name: a.courseName,
        total_lectures: a.totalLectures,
        attended_lectures: a.attendedLectures,
        percentage: a.percentage,
        term_id: a.termId ?? '',
        last_updated: new Date().toISOString(),
      })),
      { onConflict: 'user_id,course_code,term_id' }
    );
  }

  // Upsert timetable
  if (data.timetable.length > 0) {
    await supabase.from('timetable').upsert(
      data.timetable.map(t => ({
        user_id: userId,
        day_of_week: t.dayOfWeek,
        time_slot: t.timeSlot,
        course_code: t.courseCode,
        course_name: t.courseName,
        room: t.room,
        faculty: t.faculty,
      })),
      { onConflict: 'user_id,day_of_week,time_slot' }
    );
  }
}
