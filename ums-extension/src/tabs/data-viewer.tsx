import { useEffect, useState } from 'react';
import { Storage } from '@plasmohq/storage';
import type { SyncResult } from '~lib/types';
import { CATEGORY_NAME } from '~lib/ums-api';

const storage = new Storage({ area: 'local' });

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span
      style={{
        background: color,
        color: '#fff',
        borderRadius: 4,
        padding: '2px 8px',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 0.5,
      }}
    >
      {children}
    </span>
  );
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginBottom: 24, border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          background: '#f9fafb',
          padding: '10px 16px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          borderBottom: open ? '1px solid #e5e7eb' : 'none',
          userSelect: 'none',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>{title}</span>
        {count !== undefined && <Badge color="#6366f1">{count}</Badge>}
        <span style={{ color: '#9ca3af', fontSize: 12 }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && <div style={{ padding: 16 }}>{children}</div>}
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: (string | number | boolean | null | undefined)[][] }) {
  if (!rows.length) return <p style={{ color: '#9ca3af', fontSize: 13 }}>No data</p>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {headers.map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '6px 10px', background: '#f3f4f6', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: '6px 10px', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap' }}>
                  {cell === true ? '✓' : cell === false ? '✗' : cell == null ? '—' : String(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RawJson({ label, data: rawData }: { label: string; data: unknown }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 16, borderTop: '1px dashed #e5e7eb', paddingTop: 12 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ fontSize: 11, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
      >
        {open ? '▲ hide' : '▼ show'} raw JSON ({label})
      </button>
      {open && (
        <pre style={{ background: '#111827', color: '#d1fae5', padding: 12, borderRadius: 6, fontSize: 10, overflowX: 'auto', maxHeight: 400, overflowY: 'auto', marginTop: 8 }}>
          {JSON.stringify(rawData, null, 2)}
        </pre>
      )}
    </div>
  );
}

function AttendanceBar({ pct }: { pct: number }) {
  const color = pct >= 75 ? '#22c55e' : pct >= 65 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, background: '#e5e7eb', borderRadius: 4, height: 8, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, background: color, height: '100%', borderRadius: 4, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 44 }}>{pct.toFixed(1)}%</span>
    </div>
  );
}

import type { CourseAssessment, Term } from '~lib/types';

function ComponentWiseMarks({ assessments, terms }: { assessments: CourseAssessment[]; terms: Term[] }) {
  if (!assessments.length) return <p style={{ color: '#9ca3af', fontSize: 13 }}>No data</p>;

  // Build term display name lookup
  const termName = new Map(terms.map(t => [t.id, t.displayName]));

  // Group: termId → courseCode → assessments[]
  const byTerm = new Map<string, Map<string, CourseAssessment[]>>();
  assessments.forEach(a => {
    const tid = a.termId ?? '__unknown__';
    if (!byTerm.has(tid)) byTerm.set(tid, new Map());
    const byCourse = byTerm.get(tid)!;
    if (!byCourse.has(a.courseCode)) byCourse.set(a.courseCode, []);
    byCourse.get(a.courseCode)!.push(a);
  });

  // Structured JSON for raw view
  const structured = Array.from(byTerm.entries()).map(([tid, byCourse]) => ({
    termId: tid,
    termName: termName.get(tid) ?? tid,
    courses: Array.from(byCourse.entries()).map(([code, rows]) => ({
      courseCode: code,
      courseName: rows[0]?.courseName ?? '',
      components: rows.map(r => ({
        type: r.assessmentType,
        maxMarks: r.maximumMarks,
        obtained: r.marksObtained,
        weightedMax: r.weightedMaximumMarks,
        weightedObtained: r.weightedMarksObtained,
        awaited: r.isAwaited,
      })),
    })),
  }));

  return (
    <div>
      {structured.map(term => (
        <div key={term.termId} style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid #e5e7eb' }}>
            {term.termName !== term.termId ? `${term.termName} (${term.termId})` : term.termId}
          </div>
          {term.courses.map(course => (
            <div key={course.courseCode} style={{ marginBottom: 12, paddingLeft: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6366f1', marginBottom: 4 }}>
                {course.courseCode} — {course.courseName}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    {['Component', 'Max', 'Obtained', 'Wt. Max', 'Wt. Obtained'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '4px 8px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {course.components.map((c, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '4px 8px', borderBottom: '1px solid #f3f4f6' }}>{c.type}</td>
                      <td style={{ padding: '4px 8px', borderBottom: '1px solid #f3f4f6' }}>{String(c.maxMarks)}</td>
                      <td style={{ padding: '4px 8px', borderBottom: '1px solid #f3f4f6', color: c.awaited ? '#f59e0b' : 'inherit' }}>{c.awaited ? 'Awaited' : String(c.obtained)}</td>
                      <td style={{ padding: '4px 8px', borderBottom: '1px solid #f3f4f6' }}>{String(c.weightedMax)}</td>
                      <td style={{ padding: '4px 8px', borderBottom: '1px solid #f3f4f6', color: c.awaited ? '#f59e0b' : 'inherit' }}>{c.awaited ? 'Awaited' : String(c.weightedObtained)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ))}
      <RawJson label="examMarks (grouped by term)" data={structured} />
    </div>
  );
}

// Join flat courses array into their respective terms
function buildTermsWithCourses(data: SyncResult): SyncResult['terms'] {
  const coursesByTerm = new Map<string, SyncResult['courses']>();
  data.courses.forEach(c => {
    const key = c.termId ?? '__unknown__';
    if (!coursesByTerm.has(key)) coursesByTerm.set(key, []);
    coursesByTerm.get(key)!.push(c);
  });
  return data.terms.map(t => ({
    ...t,
    courses: coursesByTerm.get(t.id) ?? [],
  }));
}

export default function DataViewer() {
  const [data, setData] = useState<SyncResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>('overview');

  useEffect(() => {
    storage.get<SyncResult>('lastSyncData').then(d => {
      setData(d ?? null);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div style={rootStyle}>
        <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading sync data...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={rootStyle}>
        <div style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No data yet</p>
          <p style={{ color: '#6b7280' }}>Open the extension popup and click <strong>Sync Now</strong> first (TEST MODE must be active).</p>
        </div>
      </div>
    );
  }

  const tabs = ['overview', 'grades', 'attendance', 'timetable', 'exams', 'courses', 'announcements', 'seating', 'messages', 'raw'];
  const termsWithCourses = buildTermsWithCourses(data);

  return (
    <div style={rootStyle}>
      {/* Header */}
      <div style={{ background: '#111827', color: '#fff', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>UMS Data Viewer</div>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>Temporary viewer — delete after approval</div>
        </div>
        <div style={{ flex: 1 }} />
        <Badge color="#f97316">TEST MODE</Badge>
      </div>

      {/* Student Info Bar */}
      {data.studentInfo && (
        <div style={{ background: '#1e293b', color: '#e2e8f0', padding: '10px 24px', display: 'flex', gap: 24, fontSize: 13, flexWrap: 'wrap' }}>
          <span><strong>Name:</strong> {data.studentInfo.name ?? '—'}</span>
          <span><strong>VID:</strong> {data.studentInfo.vid ?? '—'}</span>
          {data.apiData?.studentInfo?.RollNumber && <span><strong>Roll No:</strong> {data.apiData.studentInfo.RollNumber}</span>}
          <span><strong>Program:</strong> {data.studentInfo.program ?? '—'}</span>
          {data.apiData?.studentInfo?.Section && <span><strong>Section:</strong> {data.apiData.studentInfo.Section}</span>}
          <span><strong>CGPA:</strong> {data.studentInfo.cgpa ?? '—'}</span>
          {data.apiData?.studentInfo?.AggAttendance && <span><strong>Agg. Att:</strong> {data.apiData.studentInfo.AggAttendance}%</span>}
          {data.apiData?.studentInfo?.PendingFee && <span style={{ color: '#fca5a5' }}><strong>Pending Fee:</strong> ₹{data.apiData.studentInfo.PendingFee}</span>}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e5e7eb', background: '#fff', paddingLeft: 24, overflowX: 'auto' }}>
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '10px 16px',
              border: 'none',
              borderBottom: tab === t ? '2px solid #f97316' : '2px solid transparent',
              background: 'none',
              cursor: 'pointer',
              fontWeight: tab === t ? 700 : 400,
              color: tab === t ? '#f97316' : '#6b7280',
              fontSize: 13,
              textTransform: 'capitalize',
              whiteSpace: 'nowrap',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto', width: '100%' }}>

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
              {[
                { label: 'Terms', value: data.terms.length, color: '#6366f1' },
                { label: 'Courses (grades)', value: data.courses.length, color: '#0ea5e9' },
                { label: 'Exam Marks', value: data.courseAssessments.length, color: '#8b5cf6' },
                { label: 'Attendance Records', value: data.attendance.length, color: '#22c55e' },
                { label: 'Timetable Slots', value: data.timetable.length, color: '#f59e0b' },
                { label: 'Current Courses', value: data.apiData?.courses?.length ?? 0, color: '#ec4899' },
                { label: 'Announcements', value: data.apiData?.announcements?.length ?? 0, color: '#f97316' },
                { label: 'Seating Plan', value: data.apiData?.seatingPlan?.length ?? 0, color: '#ef4444' },
                { label: 'Messages', value: data.apiData?.messages?.length ?? 0, color: '#64748b' },
                { label: 'Fee Heads', value: data.apiData?.heads?.length ?? 0, color: '#78716c' },
              ].map(stat => (
                <div key={stat.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '16px 20px' }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Terms summary */}
            <Section title="Terms" count={data.terms.length}>
              <Table
                headers={['ID', 'Display Name', 'Category', 'Active', 'TGPA', 'Courses']}
                rows={termsWithCourses.map(t => [t.id, t.displayName, t.category, t.isActive, t.tgpa ?? '—', t.courses.length])}
              />
            </Section>
          </div>
        )}

        {/* GRADES */}
        {tab === 'grades' && (
          <div>
            {termsWithCourses.length > 0 ? (
              termsWithCourses.map(term => (
                <Section key={term.id} title={`${term.displayName || term.id}${term.tgpa ? ` — TGPA: ${term.tgpa}` : ''}`} count={term.courses.length}>
                  <Table
                    headers={['Course Code', 'Course Name', 'Grade', 'Credits']}
                    rows={term.courses.map(c => [c.courseCode, c.courseName, c.grade, c.credits ?? '—'])}
                  />
                </Section>
              ))
            ) : (
              <Section title="All Courses" count={data.courses.length}>
                <Table
                  headers={['Course Code', 'Course Name', 'Grade', 'Credits', 'Term']}
                  rows={data.courses.map(c => [c.courseCode, c.courseName, c.grade, c.credits ?? '—', c.termId ?? '—'])}
                />
              </Section>
            )}
            <RawJson label="courses (flat)" data={data.courses} />
          </div>
        )}

        {/* ATTENDANCE */}
        {tab === 'attendance' && (
          <Section title="Attendance" count={data.attendance.length}>
            {data.attendance.length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: 13 }}>No attendance data</p>
            ) : (
              <div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      {['Course Code', 'Course Name', 'Total', 'Present', 'Attendance %'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '6px 10px', background: '#f3f4f6', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.attendance.map((a, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={{ padding: '6px 10px', borderBottom: '1px solid #f3f4f6' }}>{a.courseCode}</td>
                        <td style={{ padding: '6px 10px', borderBottom: '1px solid #f3f4f6' }}>{a.courseName}</td>
                        <td style={{ padding: '6px 10px', borderBottom: '1px solid #f3f4f6' }}>{a.totalLectures}</td>
                        <td style={{ padding: '6px 10px', borderBottom: '1px solid #f3f4f6' }}>{a.attendedLectures}</td>
                        <td style={{ padding: '8px 10px 4px', borderBottom: '1px solid #f3f4f6', minWidth: 160 }}>
                          <AttendanceBar pct={a.percentage} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <RawJson label="attendance" data={data.apiData?.attendance} />
              </div>
            )}
          </Section>
        )}

        {/* TIMETABLE */}
        {tab === 'timetable' && (
          <Section title="Timetable" count={data.timetable.length}>
            {data.timetable.length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: 13 }}>No timetable data parsed</p>
            ) : (
              <Table
                headers={['Day', 'Time Slot', 'Course Code', 'Course Name', 'Room', 'Faculty']}
                rows={data.timetable.map(e => [e.dayOfWeek, e.timeSlot, e.courseCode, e.courseName, e.room, e.faculty])}
              />
            )}
            <RawJson label="timetable" data={data.timetable} />
          </Section>
        )}

        {/* EXAMS */}
        {tab === 'exams' && (
          <Section title="Exam Marks" count={data.courseAssessments.length}>
            <ComponentWiseMarks assessments={data.courseAssessments} terms={termsWithCourses} />
          </Section>
        )}

        {/* CURRENT COURSES (API) */}
        {tab === 'courses' && (
          <Section title="Current Semester Courses (API)" count={data.apiData?.courses?.length ?? 0}>
            <Table
              headers={['Course Code', 'Course Name', 'Term', 'Roll No', 'Attendance %', 'Exam Pattern']}
              rows={(data.apiData?.courses ?? []).map(c => [c.CourseCode, c.CourseName, c.Term, c.RollNo, `${c.AttendancePct}%`, c.ExamPattern])}
            />
            <RawJson label="apiData.courses" data={data.apiData?.courses} />
          </Section>
        )}

        {/* ANNOUNCEMENTS */}
        {tab === 'announcements' && (
          <Section title="Announcements" count={data.apiData?.announcements?.length ?? 0}>
            {(data.apiData?.announcements ?? []).length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: 13 }}>No announcements</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(data.apiData?.announcements ?? []).map((a, i) => (
                  <div key={i} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <strong style={{ fontSize: 13 }}>{a.subject}</strong>
                      <Badge color="#6366f1">{CATEGORY_NAME[a.categorycode] ?? a.categorycode}</Badge>
                      <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9ca3af' }}>{a.date} {a.time}</span>
                    </div>
                    <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 4px' }}>By: {a.employeename}</p>
                    <p style={{ fontSize: 12, color: '#4b5563', margin: 0, whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: a.announcement }} />
                  </div>
                ))}
              </div>
            )}
            <RawJson label="apiData.announcements" data={data.apiData?.announcements} />
          </Section>
        )}

        {/* SEATING PLAN */}
        {tab === 'seating' && (
          <Section title="Exam Seating Plan" count={data.apiData?.seatingPlan?.length ?? 0}>
            <Table
              headers={['Course Code', 'Course Name', 'Exam Date', 'Exam Type', 'Room', 'Status']}
              rows={(data.apiData?.seatingPlan ?? []).map(s => [s.CourseCode, s.CourseName, s.ExamDate, s.ExamType, s.Room, s.Status])}
            />
            <RawJson label="apiData.seatingPlan" data={data.apiData?.seatingPlan} />
          </Section>
        )}

        {/* MESSAGES */}
        {tab === 'messages' && (
          <Section title="Messages" count={data.apiData?.messages?.length ?? 0}>
            {(data.apiData?.messages ?? []).length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: 13 }}>No messages</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(data.apiData?.messages ?? []).map((m, i) => (
                  <div key={i} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <strong style={{ fontSize: 13 }}>{m.Subject}</strong>
                      <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9ca3af' }}>{m.Date}</span>
                    </div>
                    <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>From: {m.SenderName}</p>
                    <p style={{ fontSize: 12, color: '#4b5563', margin: 0, whiteSpace: 'pre-wrap' }}>{m.Body}</p>
                  </div>
                ))}
              </div>
            )}
            <RawJson label="apiData.messages" data={data.apiData?.messages} />
          </Section>
        )}

        {/* RAW JSON */}
        {tab === 'raw' && (
          <Section title="Raw JSON Data">
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button
                onClick={() => {
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'ums-data.json';
                  a.click();
                }}
                style={{ padding: '6px 14px', background: '#111827', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
              >
                Download JSON
              </button>
            </div>
            <pre style={{ background: '#111827', color: '#d1fae5', padding: 16, borderRadius: 8, fontSize: 11, overflowX: 'auto', maxHeight: 600, overflowY: 'auto' }}>
              {JSON.stringify(data, null, 2)}
            </pre>
          </Section>
        )}
      </div>
    </div>
  );
}

const rootStyle: React.CSSProperties = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  background: '#f3f4f6',
  minHeight: '100vh',
  color: '#111827',
};
