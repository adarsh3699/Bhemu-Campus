# UMS Data Fetch Reference

How the Chrome extension scrapes and fetches data from the LPU UMS portal.

---

## Session

All requests require an active UMS session cookie. The extension reads it via `chrome.cookies.get` on `ums.lpu.in`. If missing → `needs_login` state.

---

## 1. Grades & Marks — HTML scraping

**URL:** `https://ums.lpu.in/lpuums/frmStudentResult.aspx`  
**Method:** GET (initial page load), then POST per term switch

### How it works

1. **GET** the page → returns HTML with the default (most recent) term loaded.
2. Extract `__VIEWSTATE`, `__EVENTVALIDATION`, `__VSTATE` hidden fields.
3. For each term ID in the dropdown (`<ul.rcbList li.rcbItem>`), **POST** back with:
    - `__VIEWSTATE`, `__EVENTVALIDATION`, `__VSTATE`
    - `__EVENTTARGET = ctl00$cphHeading$rdTerm`
    - `ctl00$cphHeading$rdTerm = <termId>`
    - `ctl00_cphHeading_rdTerm_ClientState = {"value":"<termId>",...}`
    - Content-Type: `multipart/form-data`
4. Parse each term's HTML response.

### Term ID format

| Suffix          | Example  | Category                                   |
| --------------- | -------- | ------------------------------------------ |
| Digits only     | `124251` | Regular — fetched and written to Firestore |
| Ends `A` or `B` | `12425B` | Reappear — fetched for marks override only |
| Ends `R`        | `12526R` | RPL — skipped entirely                     |

### What is parsed per term

- **Course grades:** `<table>` rows with course code, name, grade, credits, termId
- **Course assessments (component marks):** rows matching `Course: CODE::NAME` header + component type rows
    - Component types: `Continuous Assessment`, `Attendance Marks`, `Objective Type End Term`, `Objective Type Mid Term`, `Theory End Term`, `Theory Mid Term`, `Practical End Term`
    - Values used: `weightedMarksObtained` (Wt. Obtained column) — always scales to 100 total
- **Term list:** extracted from `<ul.rcbList>` dropdown once (only on initial GET)

---

## 2. Student Basic Info — JSON API

**URL:** `https://ums.lpu.in/lpuums/StudentDashboard.aspx/GetStudentBasicInformation`  
**Method:** POST  
**Body:** `{}`  
**Response:** `{ d: [{StudentName, Registrationnumber, Program, BatchYear, CGPA, AggAttendance, PendingFee, ...}] }`

Returns an array with one element. Used for `studentInfo` on the profile.

---

## 3. Attendance — JSON API (HTML response)

**URL:** `https://ums.lpu.in/lpuums/StudentDashboard.aspx/StudentAttendanceSummary`  
**Method:** POST  
**Body:** `{}`  
**Response:** `{ d: "<html table>" }` — HTML string, not JSON

Parse `<tr>` rows. Each row: `CourseCode:CourseName | ExamDate | Slot | TotalDuty | Present | Percentage`

Skip rows containing "Aggregate".

---

## 4. Current Semester Courses — JSON API (HTML response)

**URL:** `https://ums.lpu.in/lpuums/StudentDashboard.aspx/GetStudentCourses`  
**Method:** POST  
**Body:** `{}`  
**Response:** `{ d: "<html>" }` — HTML with `.mycoursesdiv` elements

Each div contains: course code, name, term, roll number, exam pattern, attendance %.  
**Only used in data viewer — not needed for sync.**

---

## 5. Announcements — JSON API

**URL:** `https://ums.lpu.in/lpuums/StudentDashboard.aspx/AnnouncementDetails`  
**Method:** POST  
**Body:** `{ LoginId: "Reg", Type: "S" }`  
**Response:** `{ d: "[{subject, announcement, categorycode, date, time, ...}]" }` — JSON string inside `d`

**Data viewer only — not needed for sync.**

Fixed category list — won't change between users:

```js
// Fixed category list — won't change between users
const ANNOUNCEMENT_CATEGORIES: UMSAnnouncementCategory[] = [
  { code: 'AC', name: 'Academic',                       displayorder: 1, today: 0, total: 0 },
  { code: 'AM', name: 'Administrative/Misc',             displayorder: 2, today: 0, total: 0 },
  { code: 'CU', name: 'Co-curricular/Sports/Cultural',   displayorder: 5, today: 0, total: 0 },
  { code: 'EX', name: 'Examination',                    displayorder: 6, today: 0, total: 0 },
  { code: 'PL', name: 'Placement',                      displayorder: 7, today: 0, total: 0 },
  { code: 'RE', name: 'Research',                       displayorder: 8, today: 0, total: 0 },
];
```

---

## 6. Seating Plan — JSON API (HTML response)

**URL:** `https://ums.lpu.in/lpuums/StudentDashboard.aspx/GetSeatingPlan`  
**Method:** POST  
**Body:** `{}`  
**Response:** `{ d: "<html>" }` — HTML with `.mycoursesdiv` elements

Each div: exam date, course code/name, exam type, room number, status badge.  
**Data viewer only — not needed for sync.**

---

## 7. Messages — JSON API (HTML response)

**URL:** `https://ums.lpu.in/lpuums/StudentDashboard.aspx/GetStudentMessages`  
**Method:** POST  
**Body:** `{}`  
**Response:** `{ d: "<html>" }` — HTML with `.mycoursesdiv` elements

Each div: subject, sender name, date, body text.  
**Data viewer only — not needed for sync.**

---

## 8. Fee Heads — JSON API

**URL:** `https://ums.lpu.in/lpuums/StudentDashboard.aspx/GetHeads`  
**Method:** POST  
**Body:** `{}`  
**Data viewer only — not needed for sync.**

---

## 9. Timetable — NOT FETCHABLE

**URL:** `https://ums.lpu.in/lpuums/Reports/frmStudentTimeTable.aspx`

Uses **Microsoft SSRS ReportViewer** — renders entirely via JavaScript/SignalR.  
Returns "Your browser does not support scripts" for any plain HTTP fetch.  
Cannot be scraped from a service worker. Skip entirely.

---

## What sync actually needs

| Data                           | Source                                  | Used for                    |
| ------------------------------ | --------------------------------------- | --------------------------- |
| Grades + component marks       | HTML scraping (`frmStudentResult.aspx`) | `gpaAndMarks` subcollection |
| Student info (name, VID, CGPA) | `GetStudentBasicInformation`            | profile `studentInfo` field |
| Attendance                     | `StudentAttendanceSummary`              | `attendanceData/main` doc   |

Everything else (courses, announcements, seating, messages, heads) is **data viewer only**.

---

## Common gotchas

- All Dashboard API endpoints return `{ d: <value> }` — unwrap `.d`
- Some `d` values are JSON strings that need a second `JSON.parse` (e.g. AnnouncementDetails)
- Some `d` values are raw HTML strings (attendance, courses, seating, messages)
- ASP.NET term-switch POST requires exact `multipart/form-data` with all hidden fields — missing any field returns the same page without switching
- `courseAssessments` from HTML always has `termId` set (passed from fetcher) — use it for Regular vs Reappear partitioning
- `term.courses` on parsed Term objects is always empty — courses come from `data.courses` with `termId` field
