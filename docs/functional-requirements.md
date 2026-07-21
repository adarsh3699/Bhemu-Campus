# Functional Requirements — Bhemu Calculator

---

## 1. GPA Calculator

### Actions
- Add/delete semesters (confirmation required for delete)
- Add/edit/delete subjects (name, grade 0–10, credit in 0.5 increments)
- Edit subject from Grades tab — only updates name, grade, credit; **preserves existing marks data**
- View SGPA per semester and CGPA across all semesters
- Toggle between **Grades** and **Marks** view modes (persisted in `localStorage` as `gpa_view_mode`)
- URL-based semester selection via `?sem=<id>`

### CGPA Summary Bar
Displayed at top of GPA Calculator page:
- Large CGPA value
- Semesters count
- Total subjects count
- Total credits
- **Average Marks** — mean of `marks.total` across all subjects that have marks entered; shows `—` if none

### Semester Tabs
- Each tab shows semester name + SGPA
- Active tab has gradient highlight + glow
- Delete button (shows on hover; requires confirmation)
- Add Semester button top-right

### Calculations
```
SGPA = Σ(grade × credit) / Σ(credit)   — per semester
CGPA = Σ(grade × credit) / Σ(credit)   — across all semesters
```

### Read-Only Mode
When viewing a shared profile with `permission="read"`, all add/edit/delete buttons are disabled and labelled "Read-only profile".

---

## 2. Grades Tab (Subject Entry)

Each subject card shows:
- Subject name, credit badge
- Grade point, Credits, Grade Points (grade × credit) stats grid
- Grade letter label bottom-right (e.g. "A+ (9)")
- Edit / Delete buttons

### Subject Entry Form
- **Subject Name** — text input
- **Grade** — dropdown (O=10, A+=9, A=8, B+=7, B=6, C=5, P/D=4, F=0) with info button
- **Credits** — number input (0.5 increments) with info button
- **Info modals:**
  - Grade info: full grade table (O→E/I) with performance descriptions
  - Credit hours info: explanation with examples (theory 3–4 CH, lab 1–2 CH)

### Update Subject Modal
- Auto-focuses and selects subject name field on open
- Same fields as add form; submit updates name, grade, credit without touching marks

---

## 3. Marks Tab (Marks Entry & Analysis)

### Marks Term Summary (top of tab)
Shown only when subjects with marks exist:
- **Term SGPA** — computed from subjects that have a grade
- **Graded count** — number of subjects with grades
- **Pending count** — subjects with no marks yet (amber if > 0)
- **Total subjects**

### Subject Card — Badges
All badges appear in the subject card header:

| Badge | Color | Condition | Meaning |
|-------|-------|-----------|---------|
| Subject code | Gray | `subject.subjectCode` exists | e.g. "CS-101" |
| `{n} cr` | Gray | Always | Credit hours |
| **UMS** | Blue | `marks.source === "ums"` | Data fetched from university portal |
| **Manual** | Teal | `marks.source === "manual"` | User entered marks manually |
| **Partial** | Gray | `marks.source === "partial"` | Some components from UMS, some missing |
| **Grade ✎** | Violet | `subject.grade !== computeGradeFromMarks(marks.total, marks.customCutoff)` | Grade was overridden from Grades tab; differs from what marks compute |
| **✦ Relative** | Amber | `marks.customCutoff !== null` | University uses relative/custom grading for this subject |

### Source Badge Logic
```
"ums"     → marks fully fetched from UMS
"manual"  → marks entered by user in Marks tab
"partial" → marks exist but some components missing/mixed
```

### Grade ✎ Badge Logic
```
gradeOverridden = hasMarks
  && marks.total != null
  && subject.grade !== computeGradeFromMarks(marks.total, marks.customCutoff)
```
Appears when user went to Grades tab and manually set a different grade than what the marks compute to.

### ✦ Relative Badge + CutoffIndicator
- Tooltip: `"Relative grading: {gradePoint} grade point set at {cutoffMarks} marks"`
- Means the university assigned a different grade than the standard table for this subject
- `customCutoff` is **write-once, UMS-only** — never created or modified by the frontend

### Marks Entry (inline edit)
Four components: CA, Mid, End, Att. (each nullable)
- Total shown live as user types
- Warning + save disabled if total > 100
- On save: `grade` recomputed from new total (unless customCutoff applies)

### Add Subject from Marks Tab
Form with: Subject Name, Credits, CA, Mid, End, Att. (marks optional)
- If marks entered: grade computed automatically, `source = "manual"`
- If no marks: subject created with grade = 0, no marks object

---

## 4. Grade Computation

### Single Source of Truth
- `subject.grade` is the authoritative value used for GPA and display everywhere
- `marks.umsGradePoint` is stored only for comparison — never displayed directly

### Display Priority
```
grade (subject.grade)  ← always shown
  fallback: computed from marks.total if grade = 0
```

### Standard Grade Table
| Marks | Letter | Points |
|-------|--------|--------|
| 90–100 | O | 10 |
| 80–89 | A+ | 9 |
| 70–79 | A | 8 |
| 60–69 | B+ | 7 |
| 50–59 | B | 6 |
| 45–49 | C | 5 |
| 40–44 | D | 4 |
| 0–39 | F | 0 |

### Marks → Grade Algorithm
```
total = ca + midTerm + endTerm + attendanceMarks
        (null components treated as 0; all null → total = null)

if customCutoff exists AND total >= customCutoff.cutoffMarks:
    grade = customCutoff.gradePoint
else:
    grade = standardGradeTable(total)
```

### Custom Cutoff (Relative Grading)
- Set only during UMS sync when `umsGradePoint !== standardGradeTable(total)`
- Example: total=66, UMS says A(8), table says B+(7) → `customCutoff: { gradePoint: 8, cutoffMarks: 66 }`
- Frontend never creates or modifies it — read-only after sync
- Total marks validation: must not exceed 100

---

## 5. UMS Integration

### Chrome Extension (UMSExtensionModal)
- Promotional modal with demo video embed
- Feature cards: auto-fetch, instant populate, sync anytime
- CTA: "Install Chrome Extension — Free"
- Works on Chrome and Chromium-based browsers

### Data Written on UMS Sync
- `marks.source = "ums"`
- `grade` and `umsGradePoint` both set to UMS-reported grade point
- `customCutoff` set if UMS grade ≠ `standardGradeTable(total)`
- `studentInfo`, `allTermIds`, `umsVerified`, `lastUMSSync` written to profile doc

---

## 6. Attendance Calculator

### Actions
- Add subject: name, total classes, attended, threshold (defaults to profile threshold)
- Edit/delete subjects (delete with confirmation)
- Set default threshold (0–100%)
- Override threshold per subject

### Calculations
```
percentage = Math.ceil((attended / totalClasses) × 100)    ← college rounding: 80.1% → 81%

needed = solve for n:  Math.ceil((attended + n) / (totalClasses + n) × 100) >= threshold
         both attended and total increase — cap 1000 iterations

safeToSkip = solve for n:  Math.ceil(attended / (totalClasses + n) × 100) >= threshold
             only total increases (skipping) — only when status is "safe"
```

### Status (three-tier)
| Condition | Status | Color |
|-----------|--------|-------|
| percentage >= threshold | Safe | Teal |
| 75 <= percentage < threshold | Warning | Amber |
| percentage < 75 | Danger | Red |

### Overall Summary
```
overallPct = Math.ceil((Σattended / ΣtotalClasses) × 100)
belowThresholdCount = subjects where Math.ceil(attended/total × 100) < threshold
```
Overall % color: teal if >= threshold, amber if >= 75, red if < 75.

---

## 7. Reappear Calculator

### Exam Types

**Theory Only** (CA: 25, MTE: 20, ETE: 50)
- Pass: `ETE% >= 30 OR (MTE+ETE)% >= 30` AND `Overall% >= 40`

**Theory + Practical** (CA: 30, Theory MTE: 20, Theory ETE: 30, Practical ETE: 20)
- Pass: theory criteria AND `Practical ETE% >= 30` AND `Overall% >= 40`

**Practical Only** (CA: 50, ETE: 50)
- Pass: `ETE% >= 30` AND `Overall% >= 40`

### Features
- User can customize max marks per component
- Shows marks required to pass if currently failing
- Result states: PASS / FAIL / ATTENTION

---

## 8. GPA Goal Planner

### Inputs
- Current CGPA, completed semesters, total semesters (4 / 6 / 8), target CGPA

### Calculation
```
requiredSGPA = (targetCGPA × totalSemesters − currentCGPA × completedSemesters) / remainingSemesters
```

### Feasibility
| Condition | Label | Color |
|-----------|-------|-------|
| requiredSGPA <= 9 | Achievable | Green |
| 9 < requiredSGPA <= 10 | Challenging | Yellow |
| requiredSGPA > 10 or < 0 | Not Achievable | Red |

---

## 9. Dashboard

- Welcome header with active profile name
- CGPA card: value, semesters count, subjects count, total credits, avg marks
- Quick links: GPA Calculator, Attendance, Reappear, Goal Planner
- Attendance summary card: overall %, subjects below threshold
- Semester performance bar chart (last 6 semesters' SGPA)
- Recent subjects table (5 most recent: semester, name, credits, grade)
- Semester roadmap timeline with GPA indicators

---

## 10. Authentication & Account

### Auth Methods
- Email/password signup with display name
- Google OAuth sign-in
- Google users can add password (links auth providers)
- Password change (requires current password verification)
- Password reset via email

### Account Deletion
- Re-authentication required (password or Google popup)
- Deletes: profiles + subcollections (gpaAndMarks, attendanceData), outgoing shares + mirror incoming, incoming shares + mirror outgoing, user doc
- Sets `bhemu_account_deleting` flag before batch commit to prevent GpaDataContext recreating a default profile
- Clears localStorage and sessionStorage
- Deletes Firebase Auth account

---

## 11. Profile Management

### Actions
- Create profile with custom name (default auto-created on first login)
- Switch profiles — updates `lastOpened` for own profiles only (never for shared — would create ghost docs)
- Delete profile with confirmation (cascades to subcollections + share cleanup)

### Profile Drawer Sections
- **My Academic Workspaces** — own profiles; "DEFAULT" badge if default, "Shared (N users)" badge if shared with others
- **Shared With Me** — profiles shared by others; "Read Only" (blue) or "Edit Access" (green) permission badge

---

## 12. Profile Sharing

### Actions
- Share with email → choose "Read Only" or "Edit Access"
- Update permission (toggle read ↔ edit)
- Unshare (hard-delete both outgoing + incoming mirror docs)
- Copy shared profile to own account

### Permission Behaviour
| Permission | Can View | Can Edit | Can Copy |
|------------|----------|----------|----------|
| read | ✅ | ❌ | ✅ |
| edit | ✅ | ✅ (real-time sync) | ❌ |

### Validation
- Valid email format required
- Cannot share with yourself
- Cannot share same profile to same email twice (active share check)
- Only own profiles can be shared (not profiles shared with you)

---

## 13. UMS Extension (Chrome)

### Authentication

Two sign-in methods:

1. **Continue with Bhemu Calculator** (primary) — reads Firebase auth state from the open Bhemu Calculator tab via a content script bridge. No password needed. If no tab is open, one is opened in the background, read, then closed.
2. **Sign in with email** (fallback) — standard email/password Firebase auth.

Sign-out clears Firebase auth, removes `fb_uid` from extension storage, and resets the last-used profile key.

### Profile Selection

- Loads all Firestore profiles for the signed-in user (`users/{uid}/profiles/`)
- Ghost docs (no `name` field) are filtered out
- Default profile sorted first, then alphabetically
- Last selected profile persisted in `chrome.storage.local` under `ums_last_profile_id`
- On logout: `ums_last_profile_id` is cleared

### Sync Flow

**Sync Everything** (primary button):
1. Check UMS session cookie — if missing, show "Log in to UMS" button
2. Fetch `frmStudentResult.aspx` (GET) + `GetStudentBasicInformation` + `StudentAttendanceSummary` in parallel
3. Switch each term via POST to collect grades + component marks for all terms
4. Write grades & marks to `gpaAndMarks/{termId}` subcollection
5. Write attendance to `attendanceData/main`
6. Write student info metadata to profile doc

**Sync Attendance Only** (secondary button):
- Same fetch pipeline, but only writes attendance to `attendanceData/main`

### Sync States

| State | Badge | Meaning |
|-------|-------|---------|
| `idle` | — | Ready; shows "Last synced {time}" if previously synced |
| `syncing` | `...` (blue) | Fetch/write in progress |
| `success` | `✓` (green) | Completed — shows while popup is open |
| `error` | `!` (red) | Fetch or write failed — message shown |
| `needs_login` | `!` (red) | UMS session cookie missing |

**Status persistence:** `success` is stored in `chrome.storage.local` with `lastSyncedAt`. On next popup open, status is converted to `idle` (with `lastSyncedAt` preserved for display). "Last synced" time is shown instead of "Ready to sync" after first successful sync.

### Term ID Format & Category Classification

| Suffix | Example | Category | Fetched? | Written to Firestore? |
|--------|---------|----------|----------|-----------------------|
| Digits only | `124251` | `Regular` | ✅ | ✅ |
| Ends `A` or `B` | `12425B`, `12526A` | `Reappear` | ✅ | ❌ (marks override only) |
| Ends `R` | `12526R` | `RPL` | ❌ | ❌ |
| Anything else | — | `Unknown` | ❌ | ❌ |

> `B` = Reappear/backlog re-attempt, `A` = Reappear/improvement. Both treated identically. Exact Backlog vs Improvement distinction unknown — treat both as Reappear until confirmed.

### Component Marks Mapping

Component marks come from the `courseAssessments` HTML table on the result page. Values used: **Wt. Obtained** (`weightedMarksObtained`) — always scales to 100 total across all components.

| Assessment Type (contains) | Maps to |
|---------------------------|---------|
| `attendance` | `attendanceMarks` |
| `continuous` or exact `ca` | `ca` |
| `mid` | `midTerm` |
| `end` or `final` | `endTerm` |
| Anything else | ignored |

Multiple components of the same type are **summed** (e.g. Theory End Term + Objective Type End Term → both go into `endTerm`).

Awaited marks (`isAwaited = true`) are skipped.

### ReAppear Marks Override Logic

If a course has a Reappear end-term mark that beats the regular exam score, the override is applied before writing to Firestore:

```
reappearEnd = sum of end-type weighted marks from Reappear terms for this course

if reappearEnd > (midTerm + endTerm):
    midTerm = 0
    endTerm = reappearEnd     ← ReAppear covers the full exam territory
else:
    no change                 ← Regular marks are already better
```

### Undeclared Term Handling

If UMS hasn't declared grades for a term yet (no courses in `data.courses` for that term), the extension synthesizes course entries from `courseAssessments`. Grade is computed from marks total using the standard grade table instead of 0.

### Grade Written to Firestore

```
grade = umsGradePoint                          if UMS has declared a grade
      = standardGradeTable(total)              if grade not declared but marks exist
      = 0                                      if no marks and no grade
```

`customCutoff` is set when `umsGradePoint ≠ standardGradeTable(total)` — relative grading case.

### Developer Tools

`PLASMO_PUBLIC_DEV_MODE=true` in `.env` enables the **View Last Sync Data** button, which opens a full data viewer tab showing all fetched UMS data (grades, attendance, exam marks, courses, announcements, seating, messages). Set to `false` in production builds — the button is compiled out entirely.

---

## 14. Settings

| Section | Feature |
|---------|---------|
| Account | Edit display name |
| Account | View email, creation date |
| Security | Create password (Google-only accounts) |
| Security | Change password (email/password accounts) |
| Profile | Rename profile (leaderboard display name updates automatically) |
| Leaderboard | Toggle leaderboard visibility (opt-out) |
| Danger Zone | Delete account with re-auth |

### Leaderboard Visibility Toggle
- Only shown when the active profile is UMS-verified (`umsVerified === true`)
- Toggle sets `optOut` field on `leaderboard/{userId}_{profileId}` doc
- Default: visible (`optOut: false`)
- When opted out: user is excluded from all leaderboard queries and rank counts; public rank page (`/rank/{id}`) returns 404

---

## 15. Notifications (Toast / Message System)

Floating toast, top-right, auto-dismisses after 8 seconds:

| Type | Color | Icon |
|------|-------|------|
| success | Emerald | CheckCircle2 |
| error | Red | AlertCircle |
| warning | Amber | AlertTriangle |
| info | Blue | Info |

Manual close button available.

---

## 16. Validation Rules

| Input | Rule |
|-------|------|
| Email | Valid format (`x@y.z`) |
| Marks components | 0–100, nullable |
| Total marks | Must not exceed 100 |
| Grade point | 0–10 |
| Credit | > 0, 0.5 increments |
| Password | Minimum 6 characters |
| Attended classes | Cannot exceed total classes |
| Threshold | 0–100 |
| CGPA / SGPA | 0–10 |

---

## 17. Local Storage Keys

| Key | Value | Purpose |
|-----|-------|---------|
| `gpa_view_mode` | "marks" \| "gpa" | Last selected tab in GPA Calculator |
| `bhemu_activeProfileId` | profileId string | Last active profile (same-device only) |
| `bhemu_account_deleting` | "1" | Prevents auto-profile creation during account deletion |

---

## 18. Leaderboard

### Access
- Requires authenticated user + UMS-verified active profile (`umsVerified === true`)
- If not logged in: shows `LoginRecommendation`
- If not UMS-synced: shows `UMSSyncPrompt` with link to Chrome Web Store extension

### Display
- Header: program name + branch (e.g. "B.Tech. Computer Science and Engineering"), batch year
- **Your Rank** badge + **N students** count
- Top 10 students by CGPA, ordered descending
  - Rank #1–3 show gold/silver/bronze medal icons
  - All students shown with shortened **profile display name** (`First L.`) except the active profile row (full name + "(You)")
- If active profile rank > 10: separator (`⋮`) + 2 students above + active profile row highlighted
- Share button (only shown when user has a leaderboard entry)

### Ranking Criteria
- Same `batchYear` (derived from `vid` digits 1–2 if `studentInfo.batchYear` is null: `"12401984"` → `"2024"`)
- Same `programCode` (extracted from `studentInfo.program`, e.g. `"P132"` from `"B.Tech. (Computer Science and Engineering) (P132 )"`)
- Ranked by `cgpa` descending
- Opted-out users (`optOut: true`) excluded from all queries and counts

### Shared Profile Support
- When viewing a shared profile, the `(You)` highlight uses the **owner's** `userId` + `profileId` (not the viewer's)
- Rank and entry are fetched using the owner's IDs

### Share & Export
- **Copy Link**: copies `https://calc.bhemu.in/rank/{userId}_{profileId}` to clipboard
- **Download Image (PNG)**: renders rank card via Canvas 2D API (`drawLeaderboardCard`)
- **Download PDF**: same canvas → jsPDF
- **Share (mobile)**: Web Share API with image file; falls back to `wa.me` text link on HTTP/desktop
- **Desktop buttons**: WhatsApp (text), LinkedIn (`shareArticle` with text), X (Twitter)

### Shareable Rank Page (`/rank/[id]`)
- Public server-rendered page; no auth required
- `id` = `{userId}_{profileId}` (Firestore leaderboard doc ID)
- Shows rank card + CTA ("Check Your Rank" → `/leaderboard`)
- Returns "Rank not found" if doc missing or `optOut: true`
- `generateMetadata` injects dynamic OG image via `/api/og/rank?id={id}` for rich link previews on WhatsApp/LinkedIn/X

### Dynamic OG Image (`/api/og/rank`)
- Edge route returning 1200×630 PNG via `ImageResponse`
- Fetches leaderboard doc via Firestore REST API (unauthenticated — requires `allow read: if true` on `leaderboard` collection)
- Shows: rank number, student name, CGPA, program, batch, branding

### Program Parsing
```
"B.Tech. (Computer Science and Engineering) (P132 )"
  → programName: "B.Tech.", branch: "Computer Science and Engineering", programCode: "P132"

"MCA (P164-NN1 )"
  → programName: "MCA", branch: null, programCode: "P164-NN1"
```
Utility: `parseProgram()` in `src/lib/programUtils.ts` (duplicated in `ums-extension/src/utils/programUtils.ts`).
`formatProgramLabel(programName, branch)` used for all display rendering.

### Data Flow
1. UMS extension sync writes to `leaderboard/{uid}_{profileId}` (first sync sets `name` from profile's display name and `optOut: false`; re-syncs update `realName` + academic fields but never touch `name` or `optOut`)
2. Profile rename in the frontend writes `{ name, updatedAt }` to the same leaderboard doc (write-through denormalization — keeps display name in sync without re-running UMS sync)
3. Frontend `useLeaderboard` hook reads from Firestore client SDK using `LeaderboardService`
4. Rank page and OG image route fetch via Firestore REST API (server-side, no auth token)
