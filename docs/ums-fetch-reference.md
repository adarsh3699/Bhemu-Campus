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
**Response:** `{ d: [{StudentName, Registrationnumber, Program, BatchYear, CGPA, AggAttendance, PendingFee, RollNumber, Section, ...}] }`

Returns an array with one element. Used for `studentInfo` on the profile.

---

## 3. Attendance — JSON API (HTML response)

**URL:** `https://ums.lpu.in/lpuums/StudentDashboard.aspx/StudentAttendanceSummary`  
**Method:** POST  
**Body:** `{}`  
**Response:** `{ d: "<html table>" }` — HTML string, not JSON

Parse `<tr>` rows. Each row: `CourseCode:CourseName | LastAttended | DutyLeave | TotalDelivered | TotalAttended | Percentage`

> [!IMPORTANT]
> **Attendance Percentage Calculation:** UMS considers Duty Leave as an officially attended class. To match the UMS `Percentage`, the correct math is `(TotalAttended + DutyLeave) / TotalDelivered`. Sync scripts must add `DutyLeave` to `TotalAttended` before passing data to the Bhemu Calculator.

Skip rows containing "Aggregate".

---

## 4. Current Semester Courses — JSON API (HTML response)

**URL:** `https://ums.lpu.in/lpuums/StudentDashboard.aspx/GetStudentCourses`  
**Method:** POST  
**Body:** `{}`  
**Response:** `{ d: "<html>" }` — HTML with `.mycoursesdiv` Bootstrap rows

### HTML structure per `.mycoursesdiv`

```html
<div class="row d-flex flex-row border-bottom mycoursesdiv ...">
	<div class="col-sm-2 p-0">
		<div class="c100 p98 small green"><span>98%</span>...</div>
		<!-- attendance % -->
	</div>
	<div class="col-sm-6 p-0">
		<p>
			<b>PETV50 </b> : COURSE NAME<br />
			<b>Term : </b>2526W
		</p>
		<p><b>Roll No : </b>R9PV34A11 / Group 1</p>
		<p><b>Exam Pattern : </b>NA</p>
	</div>
	...
</div>
```

Parse: attendance from `.c100 span`, course code/name/term from first `<p>`, roll no from second `<p>`, exam pattern from third `<p>`.  
**Data viewer only — not needed for sync.**

---

## 5. Announcements — JSON API

**URL:** `https://ums.lpu.in/lpuums/StudentDashboard.aspx/AnnouncementDetails`  
**Method:** POST  
**Body:** `{ LoginId: "Reg", Type: "S" }`  
**Response:** `{ d: [{__type, subject, announcement, categorycode, date, time, announcementid, isread, uploadedby, employeename, status, HeaderDate, Files: [{id, filepath, FileName}]}] }`

`d` is a **direct JSON array** (not a double-encoded string) — check with `Array.isArray(d)` before trying `JSON.parse`.

`announcement` field contains **HTML** with `<p>`, `<ul>`, `<strong>`, `<a href>` etc. Render via `dangerouslySetInnerHTML`. LPU uses many `<p>&nbsp;</p>` spacers — collapse with CSS: `p { margin: 0 0 4px } p:empty { display: none }`.

`Files` array contains attachment metadata. Download URL: `https://ums.lpu.in` + `filepath`.

**Data viewer only — not needed for sync.**

Fixed category list:

```js
const ANNOUNCEMENT_CATEGORIES = [
	{ code: "AC", name: "Academic" },
	{ code: "AM", name: "Administrative/Misc" },
	{ code: "CU", name: "Co-curricular/Sports/Cultural" },
	{ code: "EX", name: "Examination" },
	{ code: "PL", name: "Placement" },
	{ code: "RE", name: "Research" },
];
```

---

## 6. Seating Plan — JSON API

**URL:** `https://ums.lpu.in/lpuums/StudentDashboard.aspx/GetSeatingPlan`  
**Method:** POST  
**Body:** `{}`  
**Response:** `{ d: "NA" }` when no exams scheduled, or `{ d: "<html>" }` with `.mycoursesdiv` elements

Returns string `"NA"` (not HTML) when no current seating plan exists — guard with `if (html === 'NA') return []`.  
**Data viewer only — not needed for sync.**

---

## 7. Messages — JSON API (HTML response)

**URL:** `https://ums.lpu.in/lpuums/StudentDashboard.aspx/ViewAllMessages`  
**Method:** POST  
**Body:** `{}`  
**Response:** `{ d: "<html>" }` — flat HTML list of `div.d-flex.flex-row.border-bottom` rows

### HTML structure per message div

```html
<div class="d-flex flex-row border-bottom">
  <p class="font-weight-medium mr-4">...</p>
  <div class="pl-3">
    <p class="font-weight-bold mb-1 mr-1"><bold>Subject   </bold></p>
    <p class="text-dark mb-0 text-small">Body text...</p>
    <p class="text-dark mb-0 text-small">Date : 28-07-2026</p>
  </div>
</div>
```

Parse: subject from `p.font-weight-bold`, body from first `p.text-dark` not starting with `Date :`, date from `p.text-dark` starting with `Date :`. No sender name field in this response.  
**Data viewer only — not needed for sync.**

---

## 8. GetHeads — JSON API

**URL:** `https://ums.lpu.in/lpuums/StudentDashboard.aspx/GetHeads`  
**Method:** POST  
**Body:** `{}`

Returns Bootstrap HTML cards with **base64-encoded JPEG photos** of the student's Mentor and TPC coordinator (~77–108 kB). Not fee data. Not parseable as structured data.

**Do not call.** `PendingFee` amount already comes from `GetStudentBasicInformation`.

---

## 9. Timetable — JSON APIs

**URL base:** `https://ums.lpu.in/lpuums/frmMyCurrentTimeTable.aspx`  
**Note:** `frmStudentTimeTable.aspx` (Reports) uses SSRS ReportViewer — not fetchable. Use `frmMyCurrentTimeTable.aspx` instead.

### How it works

1. **GET** `frmMyCurrentTimeTable.aspx` → extract TermId from `<select name="Select1"> option:first-child` value (e.g. `"26271"`). The select is hidden (`style="display:none"`) but present in page HTML.

2. **POST** `frmMyCurrentTimeTable.aspx/GetTimeTable` with `{ TermId: "26271" }` + header `Referer: https://ums.lpu.in/lpuums/frmMyCurrentTimeTable.aspx` (server validates same-origin).  
   **Response:** `{ d: "<html>" }` — weekly schedule HTML

### Timetable HTML structure

```html
<section id="w-schedule-mon" class="w-schedule__day js-tabs__panel">
	<div class="w-schedule__col-label text-sm">Monday</div>
	<ul class="w-schedule__events">
		<li class="w-schedule__event-wrapper">
			<a
				onclick='openPopup("Lecture / G:All C:PETV50 / R: Assignment-1 / S:9PV34 / Teacher: 21482::Amarinder Kaur", "19:00-20:00", "Monday", "Assignment-1", "PETV50", "L")'
			>
				<div title="Assignment-1 - L - PETV50">Assignment-1 - L - PETV50</div>
				<div title="9PV34">9PV34</div>
			</a>
		</li>
	</ul>
</section>
```

Parse `onclick` args: `openPopup(desc, timeRange, day, courseName, courseCode, type)`:

- `desc` contains room: match `/\bS:(\S+)/` and faculty: match `/Teacher: \d+::(.+)$/`
- `timeRange` = `"19:00-20:00"` → split on `-`

**Other timetable endpoints (not used):**

- `GetTimeRange` → returns just a time range string like `"12:00-22:00"` (NOT a TermId)
- `GetWeeklyTimeTable` → requires TermId but returns empty HTML without correct term; use `GetTimeTable` instead

**Data viewer only — not needed for sync (timetable data is not written to Firestore).**

---

## What sync actually needs

| Data                           | Source                                  | Used for                    |
| ------------------------------ | --------------------------------------- | --------------------------- |
| Grades + component marks       | HTML scraping (`frmStudentResult.aspx`) | `gpaAndMarks` subcollection |
| Student info (name, VID, CGPA) | `GetStudentBasicInformation`            | profile `studentInfo` field |
| Attendance                     | `StudentAttendanceSummary`              | `attendanceData/main` doc   |

Everything else (courses, announcements, seating, messages, timetable) is **data viewer only** — fetched for developer inspection but not written to Firestore.

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

| File                                                 | Role                                                                   |
| ---------------------------------------------------- | ---------------------------------------------------------------------- |
| `patches/react-native-webview@13.16.1.patch`         | Java: intercept requests, strip header, sync cookies, handle redirects |
| `apps/mobile/src/features/sync/UMSLoginWebView.tsx`  | WebView + stealth JS (form body capture, hide markers)                 |
| `apps/mobile/src/features/sync/webviewSyncScript.ts` | Post-login scraping (same endpoints as extension)                      |
| `apps/mobile/src/features/sync/syncCoordinator.ts`   | Writes scraped data to Firestore via `@bhemu/firebase`                 |

### Why each piece is necessary

- **Java patch**: only way to strip `X-Requested-With` from native network layer.
- **POST body capture**: `WebResourceRequest` has no POST body API; must pass via JS→Java bridge.
- **Submit button in FormData**: ASP.NET requires the clicked button's name/value to process the form. `new FormData()` alone omits it.
- **Cookie sync**: Java's `HttpURLConnection` receives `Set-Cookie` but doesn't auto-share with WebView — must manually call `CookieManager.setCookie()`.
- **Redirect via JS page**: returning a 302's final HTML directly breaks `window.location` (still shows old URL); the JS redirect triggers a proper navigation.

---

## Common gotchas

- All Dashboard API endpoints return `{ d: <value> }` — unwrap `.d`
- `AnnouncementDetails`: `d` is a **direct array**, not a double-encoded string — do NOT `JSON.parse` it
- Some `d` values are raw HTML strings (attendance, courses, seating, messages, timetable)
- `GetSeatingPlan` returns `"NA"` string (not HTML) when no exams are scheduled
- `GetHeads` returns faculty photo cards (~77–108 kB base64 JPEG) — not fee data, skip entirely
- Timetable `GetTimeRange` returns a time range string, NOT a TermId — get TermId from page HTML `<select name="Select1">`
- `GetTimeTable` requires `Referer` header matching the timetable page or server returns 500
- ASP.NET term-switch POST requires exact `multipart/form-data` with all hidden fields — missing any field returns the same page without switching
- `courseAssessments` from HTML always has `termId` set (passed from fetcher) — use it for Regular vs Reappear partitioning
- `term.courses` on parsed Term objects is always empty — courses come from `data.courses` with `termId` field
