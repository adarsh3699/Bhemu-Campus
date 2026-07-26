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

## Mobile WebView approach

The mobile app (React Native) opens UMS in a WebView. LPU detects WebView via the
`X-Requested-With` header that Android's WebView adds to **every** HTTP request at
the native network layer. JS cannot strip it — only Java can.

### How the bypass works (`patches/react-native-webview@13.16.1.patch`)

1. **Java `shouldInterceptRequest`** intercepts ALL requests to `ums.lpu.in`:
   - Re-issues the request via `HttpURLConnection` without `X-Requested-With`.
   - For HTML responses: injects a stealth `<script>` that hides `window.ReactNativeWebView`, `window.Android`, and `navigator.webdriver`.
   - For non-HTML (CSS/JS/images): proxies the response as-is, just sans header.
   - Syncs `Set-Cookie` from each response back into `CookieManager`.
   - On 302 redirects: returns a small HTML page with `window.location.replace(url)` so the WebView navigates properly (updating `window.location` and re-firing `injectedJavaScriptBeforeContentLoaded`).

2. **POST body capture** — `WebResourceRequest` cannot read POST bodies, so:
   - Java registers a `__umsPostCapture` JavascriptInterface.
   - JS (`injectedJavaScriptBeforeContentLoaded`) overrides `HTMLFormElement.prototype.submit` and listens for `submit` events.
   - Before each form submission, JS serializes `new FormData(form)` + the submit button's `name`/`value` (required by ASP.NET) and passes it to Java via `__umsPostCapture.captureBody(qs)`.
   - A 120ms `setTimeout` ensures the body reaches Java before the real native submit fires.
   - Java spin-waits up to 250ms for `pendingUmsPostBody` to be set.

3. **User-Agent** — set to Chrome Android (`Chrome/124.0.0.0 Mobile Safari/537.36`) without the `wv` marker so Cloudflare Turnstile's fingerprint check passes.

### Key files

| File | Role |
|------|------|
| `patches/react-native-webview@13.16.1.patch` | Java: intercept requests, strip header, sync cookies, handle redirects |
| `apps/mobile/src/features/sync/UMSLoginWebView.tsx` | WebView + stealth JS (form body capture, hide markers) |
| `apps/mobile/src/features/sync/webviewSyncScript.ts` | Post-login scraping (same endpoints as extension) |
| `apps/mobile/src/features/sync/syncCoordinator.ts` | Writes scraped data to Firestore via `@bhemu/firebase` |

### Why each piece is necessary

- **Java patch**: only way to strip `X-Requested-With` from native network layer.
- **POST body capture**: `WebResourceRequest` has no POST body API; must pass via JS→Java bridge.
- **Submit button in FormData**: ASP.NET requires the clicked button's name/value to process the form. `new FormData()` alone omits it.
- **Cookie sync**: Java's `HttpURLConnection` receives `Set-Cookie` but doesn't auto-share with WebView — must manually call `CookieManager.setCookie()`.
- **Redirect via JS page**: returning a 302's final HTML directly breaks `window.location` (still shows old URL); the JS redirect triggers a proper navigation.

---

## Common gotchas

- All Dashboard API endpoints return `{ d: <value> }` — unwrap `.d`
- Some `d` values are JSON strings that need a second `JSON.parse` (e.g. AnnouncementDetails)
- Some `d` values are raw HTML strings (attendance, courses, seating, messages)
- ASP.NET term-switch POST requires exact `multipart/form-data` with all hidden fields — missing any field returns the same page without switching
- `courseAssessments` from HTML always has `termId` set (passed from fetcher) — use it for Regular vs Reappear partitioning
- `term.courses` on parsed Term objects is always empty — courses come from `data.courses` with `termId` field
