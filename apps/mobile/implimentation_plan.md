# Bhemu Calculator — Mobile App Plan

## Context

The monorepo has `apps/frontend` and `apps/ums-extension`. Before building the mobile app, two pre-work tasks extract shared Firebase services. Then the mobile app is built phase by phase with full feature parity to the frontend.

**Tech Stack — Mobile:**

- **Latest stable Expo SDK** — use `npx create-expo-app` to get the latest stable SDK; all Expo packages auto-resolved via `npx expo install`
- **Expo Router** — file-based routing (mirrors Next.js App Router); installed via `npx expo install expo-router`
- **Firebase JS SDK `^12.x`** — same web SDK as frontend; Expo requires v12+; install via `npm install firebase`
- **NativeWind v4** + **tailwindcss v3** — NativeWind v4 requires Tailwind **v3** (NOT v4); install via `npm install nativewind tailwindcss@^3`
- **React Context + hooks** — same pattern as frontend
- **`@bhemu/shared`** + **`@bhemu/firebase`** — all shared logic
- **Expo Dev Client required** for native packages (Skia, Reanimated, Gesture Handler, AsyncStorage, view-shot)

**Installation rule:** All Expo packages (`expo-*`) must be installed via `npx expo install <pkg>` — this auto-selects the version compatible with your installed SDK. Non-Expo packages (`firebase`, `nativewind`, `victory-native`, etc.) use `npm install` or `pnpm install`.

---

## Pre-work A — Move `ShareData` into `@bhemu/shared`

`ShareData` is currently frontend-only (`apps/frontend/src/types/gpa.ts`). Mobile needs it for the sharing UI.

**Change:** Move `ShareData` → `packages/shared/src/types/gpa.ts`
**Update:** `apps/frontend/src/types/index.ts` — import `ShareData` from `@bhemu/shared`
**Test:** `pnpm typecheck` — all workspaces pass

---

## Pre-work B — Create `packages/firebase/`

`gpaService.ts`, `attendanceService.ts`, `leaderboardService.ts` will be **identical** between frontend and mobile. Extract them to `@bhemu/firebase` instead of duplicating.

The only change: services currently read `db` directly from `./config`. In the shared package, `db` must be injected:

```ts
// packages/firebase/src/gpaService.ts
import type { Firestore } from "firebase/firestore";
export class GPAService {
  constructor(private db: Firestore, private userId: string) { ... }
}
export function createGPAService(db: Firestore, userId: string) {
  return new GPAService(db, userId);
}
```

Each app has a thin factory wrapper:

```ts
// apps/frontend/src/firebase/services.ts  (and same in apps/mobile/src/firebase/)
import { db } from "./config";
import { createGPAService, createAttendanceService, LeaderboardService } from "@bhemu/firebase";
export const gpaService = (uid: string) => createGPAService(db, uid);
export const attendanceService = (uid: string) => createAttendanceService(db, uid);
export { LeaderboardService };
```

**Package structure:**

```
packages/
├── shared/         ← zero deps (done)
└── firebase/       ← depends on firebase@^12.x only
    ├── package.json      name: "@bhemu/firebase"
    ├── tsconfig.json
    ├── tsup.config.ts
    └── src/
        ├── index.ts
        ├── gpaService.ts
        ├── attendanceService.ts
        └── leaderboardService.ts
```

**How to test Pre-work B:**

1. `pnpm install` from root — no errors
2. `turbo build --filter=@bhemu/firebase` — builds clean
3. `pnpm typecheck` — all workspaces pass
4. `pnpm dev:web` — app works identically (no behaviour change)
5. Create profile, add semester, add subject → saves to Firestore correctly

---

## Architecture — Mobile App

Following Expo SDK 55 official conventions (`src/`-based layout, config files at root, `assets/` at root):

```
apps/mobile/
│
├── src/
│   ├── app/                        ← FILE-BASED ROUTES ONLY (nothing else here)
│   │   ├── _layout.tsx             ← Root: providers, fonts, splash, theme
│   │   ├── index.tsx               ← Redirect: authed → /(app), guest → /(auth)/sign-in
│   │   ├── +not-found.tsx          ← 404 screen
│   │   ├── (auth)/
│   │   │   ├── _layout.tsx         ← Auth stack navigator (no tab bar)
│   │   │   ├── sign-in.tsx
│   │   │   ├── sign-up.tsx
│   │   │   ├── forgot-password.tsx
│   │   │   ├── reset-password.tsx
│   │   │   └── verify-email.tsx
│   │   └── (app)/
│   │       ├── _layout.tsx         ← Auth gate + all data providers
│   │       └── (tabs)/
│   │           ├── _layout.tsx     ← Tab bar (5 tabs with icons)
│   │           ├── index.tsx       ← Dashboard tab
│   │           ├── gpa.tsx         ← GPA Calculator tab
│   │           ├── attendance.tsx  ← Attendance tab
│   │           ├── tools/          ← Tools sub-stack (folder, not file)
│   │           │   ├── _layout.tsx ← Stack navigator
│   │           │   ├── index.tsx   ← Tools menu
│   │           │   ├── goal-planner.tsx
│   │           │   └── reappear.tsx
│   │           ├── leaderboard.tsx ← Leaderboard tab
│   │           └── settings.tsx    ← Settings tab
│   │
│   ├── components/
│   │   ├── ui/                     ← Primitives only: Button, Card, Input, Badge, ConfirmModal, InputModal
│   │   │                           ← No domain knowledge, no Firebase imports
│   │   ├── layout/
│   │   │   └── SafeScreen.tsx      ← SafeAreaView + scroll wrapper (no domain logic)
│   │   ├── profile/                ← Profile management feature (used app-wide)
│   │   │   ├── ProfileDrawer.tsx   ← Bottom sheet: profile switch, add, delete, share
│   │   │   └── ShareModal.tsx      ← Share profile by email + permissions
│   │   ├── Dashboard/
│   │   ├── GpaCalculator/
│   │   │   ├── hooks/              ← Feature-scoped hooks only
│   │   │   │   └── useViewMode.ts  ← AsyncStorage read/write for gpa_view_mode (side effect → extract)
│   │   │   └── *.tsx               ← Components
│   │   ├── AttendanceCalculator/
│   │   ├── Leaderboard/
│   │   ├── ReappearCalculator/
│   │   ├── GpaGoalPlanner/
│   │   └── Settings/
│   │
│   ├── contexts/
│   │   ├── AuthContext.tsx          ← Auth provider (React Context, not a Firebase file)
│   │   ├── GpaDataContext.tsx       ← Ported; AsyncStorage replaces localStorage
│   │   ├── MarksDataContext.tsx     ← Identical to frontend
│   │   ├── AttendanceDataContext.tsx
│   │   └── MessageContext.tsx       ← react-native-toast-message
│   │
│   ├── firebase/
│   │   ├── config.ts                ← Firebase init (EXPO_PUBLIC_ env vars)
│   │   └── services.ts              ← Factory wrappers using @bhemu/firebase
│   │
│   ├── hooks/                       ← Shared hooks used by 2+ features
│   │   ├── useColorScheme.ts
│   │   └── useColorScheme.web.ts    ← Platform split
│   │
│   ├── constants/
│   │   ├── Colors.ts                ← Light/dark color tokens
│   │   ├── Typography.ts
│   │   └── index.ts
│   │
│   ├── types/
│   │   └── index.ts                 ← Re-exports @bhemu/shared types + mobile-only
│   │
│   ├── lib/                         ← Pure utility functions (not utils/ — follows skill convention)
│   │   └── cn.ts                    ← clsx + twMerge helper for NativeWind
│   │
│   └── global.css                   ← NativeWind entry point
│
├── assets/                          ← Static assets (ROOT level, not in src/)
│   ├── fonts/
│   ├── images/
│   └── icons/
│
├── app.json                         ← Expo config
├── tailwind.config.js               ← NativeWind config (ROOT)
├── metro.config.js                  ← Metro + pnpm workspace config (ROOT)
├── babel.config.js                  ← babel-preset-expo (ROOT)
├── tsconfig.json                    ← "@/*": ["./src/*"] + @bhemu aliases
├── expo-env.d.ts                    ← Auto-generated typed routes (do NOT edit)
├── nativewind-env.d.ts              ← NativeWind type reference
└── package.json
```

**Key structural rules (Expo Router + react-architecture skill):**

- `src/app/` contains routes only — no components, hooks, or utils
- Route groups `(auth)` and `(app)` — parentheses stripped from URLs
- `_layout.tsx` = navigator, `index.tsx` = default screen, `+not-found.tsx` = 404
- `ui/` — primitives only, zero domain knowledge, never imports Firebase or lib/
- `components/<feature>/hooks/` — only when a hook owns a side effect or 3+ interdependent state values; never just an event handler or simple derived value
- `profile/` feature folder for `ProfileDrawer` and `ShareModal` — domain logic, not primitives
- `AuthContext` lives in `contexts/` — it's a React Context, not a Firebase config file
- `lib/` for pure functions — not `utils/` (per react-architecture skill)
- Inline JSX when it's simple, single-use, with no side effects — not everything needs a file

---

## Phase 1 — Workspace Foundation

**Goal:** `apps/mobile/` is a valid Expo workspace. Metro resolves `@bhemu/shared` and `@bhemu/firebase`. Placeholder screen in Expo Go. **Stop — wait for your approval before Phase 2.**

### Files created

- `apps/mobile/package.json` — scaffold via `npx create-expo-app apps/mobile --template` then add deps:

    ```bash
    # From apps/mobile/ — Expo packages (SDK-aligned versions auto-resolved)
    npx expo install expo-router expo-font expo-splash-screen expo-haptics \
      expo-print expo-auth-session expo-web-browser \
      @react-native-async-storage/async-storage \
      react-native-reanimated react-native-gesture-handler

    # Non-Expo packages — latest stable
    pnpm add firebase                          # ^12.x required by Expo
    pnpm add nativewind                        # v4.x
    pnpm add -D tailwindcss@^3                 # NativeWind v4 requires Tailwind v3, NOT v4
    pnpm add @shopify/react-native-skia        # latest stable (required by victory-native)
    pnpm add react-native-worklets             # required by reanimated v4
    pnpm add victory-native                    # latest stable (charts)
    pnpm add react-native-toast-message
    pnpm add react-native-view-shot
    pnpm add react-native-youtube-iframe       # monitor — not officially New-Arch tested; fallback: expo-video

    # Workspace packages
    pnpm add @bhemu/shared@workspace:* @bhemu/firebase@workspace:*
    ```

    **Tailwind warning:** `tailwindcss` must be v3.x — NativeWind v4 does not support v4 yet. Always install with `tailwindcss@^3`.

- `apps/mobile/tsconfig.json` — `"@/*": ["./src/*"]` + `@bhemu/shared` and `@bhemu/firebase` path aliases
- `apps/mobile/metro.config.js` — pnpm workspace symlink config + NativeWind
- `apps/mobile/babel.config.js` — `babel-preset-expo`
- `apps/mobile/app.json` — Expo project config (name: "Bhemu Calculator", slug: "bhemu-calculator")
- `apps/mobile/tailwind.config.js` — NativeWind preset + content pointing to `./src/**`
- `apps/mobile/nativewind-env.d.ts` — NativeWind type reference
- `apps/mobile/src/global.css` — `@tailwind` directives
- `apps/mobile/src/app/_layout.tsx` — minimal root layout importing `global.css`
- `apps/mobile/src/app/index.tsx` — placeholder screen ("Bhemu Calculator Mobile")
- `apps/mobile/assets/` — placeholder icon and splash images
- Root `package.json` — add `dev:mobile` and `build:mobile` scripts
- `turbo.json` — add `.expo/**` to `outputs` array so Expo build artifacts are cached correctly

### Metro config

```js
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");
const config = getDefaultConfig(projectRoot);

// pnpm workspace symlink support — scope to packages/ only
config.watchFolders = [path.resolve(monorepoRoot, "packages")];
config.resolver.nodeModulesPaths = [
	path.resolve(projectRoot, "node_modules"),
	path.resolve(monorepoRoot, "node_modules"),
];
config.resolver.unstable_enableSymlinks = true;

module.exports = withNativeWind(config, { input: "./src/global.css" });
```

### How to test Phase 1

1. `pnpm install` from root — no errors, 5 workspaces linked
2. `pnpm dev:mobile` — Metro bundler starts cleanly
3. Scan QR in **Expo Go** — placeholder screen renders. **Note:** From Phase 2 onwards, use **Expo Dev Client** (`npx expo run:ios` / `npx expo run:android`) because native packages like AsyncStorage, Reanimated v4, Skia, and view-shot cannot run in plain Expo Go
4. `cd apps/mobile && node -e "require.resolve('@bhemu/shared')"` — resolves
5. `cd apps/mobile && node -e "require.resolve('@bhemu/firebase')"` — resolves
6. `pnpm typecheck` from root — all 5 workspaces pass

---

## Phase 2 — Firebase & Auth (5 screens)

**Goal:** All auth screens working. Email/password + Google Sign-In. Auth-based navigation redirect. **Stop — wait for your approval before Phase 3.**

### Files created

- `apps/mobile/src/firebase/config.ts` — web SDK init with `EXPO_PUBLIC_FIREBASE_*`
- `apps/mobile/src/firebase/services.ts` — factory wrappers using `@bhemu/firebase`
- `apps/mobile/src/contexts/AuthContext.tsx` — ported with:
    - Google Sign-In: `expo-auth-session` + `signInWithCredential` (works in Expo Go, no native module)
    - `AsyncStorage` instead of `localStorage` for `bhemu_account_deleting` flag
    - All other methods identical: `signup`, `login`, `logout`, `resetPassword`, `confirmPasswordReset`, `updateDisplayName`, `createPassword`, `changePassword`, `deleteAllUserData`, `isGoogleUser`, `hasPassword`
- `apps/mobile/src/contexts/MessageContext.tsx` — `react-native-toast-message`
- `apps/mobile/src/app/_layout.tsx` — wraps in all providers, handles font loading + splash
- `apps/mobile/src/app/(app)/_layout.tsx` — auth gate: redirects to `/sign-in` if no user
- `apps/mobile/src/app/(auth)/_layout.tsx` — auth stack navigator
- `apps/mobile/src/app/(auth)/sign-in.tsx` — email/password + Google button
- `apps/mobile/src/app/(auth)/sign-up.tsx` — name, email, password
- `apps/mobile/src/app/(auth)/forgot-password.tsx` — send reset email
- `apps/mobile/src/app/(auth)/reset-password.tsx` — consume `oobCode` + **password strength meter** (4 criteria: length, uppercase, numbers, symbols — 3-bar visual matching frontend)
- `apps/mobile/src/app/(auth)/verify-email.tsx` — success screen with resend button
- `apps/mobile/.env.example` — `EXPO_PUBLIC_FIREBASE_*` template

### Auth navigation

```
index.tsx → authed?  → /(app)/(tabs)/
           → guest?  → /(auth)/sign-in
/(auth)/sign-in → success → /(app)/(tabs)/
/(auth)/sign-up → success → /(auth)/sign-in
```

### How to test Phase 2

1. Create `apps/mobile/.env` with Firebase credentials
2. Register new account → verify user in Firebase Auth console
3. Log out → log back in with email/password
4. Google Sign-In flow
5. Forgot Password → reset email arrives
6. Reset Password — requires deep-linking: configure `scheme` in `app.json` (e.g. `"scheme": "bhemu"`), tap the reset link in the email → app opens at `reset-password` screen → password strength meter shows 4 criteria → submit → verify new password works in Firebase Auth
7. Open app without auth → redirects to sign-in screen

---

## Phase 3 — GPA Calculator (core feature)

**Goal:** Profiles, semesters, subjects with both entry modes (Marks + Grades) working end-to-end with Firestore. **Stop — wait for your approval before Phase 4.**

### Files created

- `apps/mobile/src/contexts/GpaDataContext.tsx` — `AsyncStorage` for `bhemu_activeProfileId`; all business logic, optimistic updates, sharing logic identical to frontend
- `apps/mobile/src/contexts/MarksDataContext.tsx` — identical to frontend
- `apps/mobile/src/app/(app)/(tabs)/gpa.tsx` — GPA Calculator screen
- `src/components/GpaCalculator/`:
    - `GpaStatsBar.tsx` — SGPA (active semester) + CGPA (all semesters); uses `calculateGPA`, `calculateCGPA` from `@bhemu/shared`
    - `SemesterTabs.tsx` — horizontal scroll tabs; add semester button; delete semester (confirm modal)
    - `SemesterPanel.tsx` — subjects list for active semester; read-only when shared profile has view-only permission
    - `SubjectCard.tsx` — subject row with inline edit for all fields; delete with confirm
    - `AddSubjectForm.tsx` — bottom sheet with **two modes:**
        - **Marks mode:** CA (max 25), MTE (max 20), ETE (max 50), Attendance marks — auto-computes grade via `computeGradeFromMarks()` from `@bhemu/shared`
        - **Grades mode:** grade point selector (O/A+/A/…) + credit hours
        - Info modals ("Grade Point" table, "Credit Hours" text) inlined inside `AddSubjectForm.tsx` — they are simple static content, single-use, no reason to extract
    - `hooks/useViewMode.ts` — owns `AsyncStorage` read/write for `gpa_view_mode` (side effect → extract per skill); the toggle UI itself is inlined in `SemesterPanel.tsx`
- `src/components/profile/ProfileDrawer.tsx` — bottom sheet:
    - Own profiles: name, last-updated, Default/Shared badges
    - Share button → `ShareModal`
    - Delete with confirm (guarded for default and last profile)
    - "Add Workspace" card → `InputModal`
    - Shared With Me section: permission badge, Copy button for read-only profiles
- `src/components/profile/ShareModal.tsx` — share profile by email + Read/Edit permission selector + list of existing shares with toggle/remove
- `src/components/ui/` — Button, Card, Input, Badge, ConfirmModal, InputModal (primitives only — no domain logic)

### Shared imports

```ts
import {
	calculateGPA,
	calculateCGPA,
	SELECTABLE_GRADES,
	pointToGrade,
	computeGradeFromMarks,
	computeTotal,
} from "@bhemu/shared";
import type { GPASubject, GPASemester, GPAProfile, ShareData } from "@bhemu/shared";
import { createGPAService } from "@bhemu/firebase";
```

### How to test Phase 3

1. Create profile → add semester → add 3 subjects in **Marks mode** → CGPA must match frontend for same data
2. Switch to **Grades mode** → add subjects directly
3. Delete subject → confirm modal → removed
4. Delete semester → confirm modal → removed
5. App restart → profile + semesters persist (Firestore + AsyncStorage)
6. Switch profiles → active profile remembered after restart
7. `pnpm typecheck` — clean

---

## Phase 4 — Dashboard

**Goal:** Dashboard with all stat cards, bar chart, roadmap, recent subjects, quick actions. **Stop — wait for your approval before Phase 5.**

### Files created

- `apps/mobile/src/app/(app)/(tabs)/index.tsx` — Dashboard tab (default tab)
- `src/components/Dashboard/`:
    - `DashboardStats.tsx` — 4 stat cards: Cumulative GPA (+ trend label Good/Average/Needs Work), Average Marks, Semester Count, Overall Attendance % — Attendance % renders `—` if `AttendanceDataContext` not yet loaded (context added in Phase 5; the stat wires up automatically once Phase 5 is done)
    - `SemesterBarChart.tsx` — per-semester SGPA using `victory-native` (requires `@shopify/react-native-skia`, `react-native-reanimated`, `react-native-worklets`, `react-native-gesture-handler`); last semester highlighted; custom tooltip. **Requires Expo Dev Client** — Skia uses C++/GPU native modules, cannot run in Expo Go
    - `SemesterRoadmap.tsx` — vertical timeline; each card: SGPA + total credits; tapping calls `router.push('/(app)/(tabs)/gpa?sem=<semId>')` — `gpa.tsx` reads this via `useLocalSearchParams()` and calls `GpaDataContext.setActiveSemester(semId)` on mount; pulsing dot on active semester
    - `RecentSubjectsTable.tsx` — last 5 subjects: Semester, Subject, Credits, grade badge (coloured)
    - `QuickActionsGrid.tsx` — 5 shortcuts: GPA Calculator, Attendance, Reappear, Goal Planner, Leaderboard

### How to test Phase 4

1. Add GPA data → Dashboard shows correct CGPA + Average Marks
2. Tap semester in roadmap → GPA tab opens at that semester
3. Bar chart renders all semesters with correct SGPA values
4. Recent Subjects shows last 5 across all semesters correctly

---

## Phase 5 — Attendance Calculator

**Goal:** Full attendance tracker matching all frontend features. **Stop — wait for your approval before Phase 6.**

### Files created

- `apps/mobile/src/contexts/AttendanceDataContext.tsx` — identical to frontend
- `apps/mobile/src/app/(app)/(tabs)/attendance.tsx`
- `src/components/AttendanceCalculator/`:
    - `AttendanceSummaryCard.tsx` — overall %, subject count, below-threshold count, default threshold setter ("Set Threshold" inline form)
    - `AttendanceSubjectList.tsx` — per-subject rows with colour coding (green ≥ threshold, amber near, red below)
    - `AttendanceSubjectForm.tsx` — bottom sheet: Subject Name, Total Classes, Attended, per-subject threshold override
    - Confirm modal on delete

### How to test Phase 5

1. Add 3 subjects → "classes you can miss / need to attend" matches frontend for same input
2. Set per-subject threshold override → colour changes independently
3. Update default threshold → all subjects without override recalculate
4. Dashboard Attendance % stat updates correctly

---

## Phase 6 — Tools: Goal Planner + Reappear Calculator

**Goal:** Both tools as pure offline computation screens. **Stop — wait for your approval before Phase 7.**

### Files created

- `apps/mobile/src/app/(app)/(tabs)/tools.tsx` — stack tab: shows index then sub-screens
- `apps/mobile/src/app/(app)/(tabs)/tools/index.tsx` — menu with two tool cards
- `apps/mobile/src/app/(app)/(tabs)/tools/goal-planner.tsx`
- `apps/mobile/src/app/(app)/(tabs)/tools/reappear.tsx`
- `src/components/GpaGoalPlanner/GpaGoalPlannerView.tsx`:
    - Inputs: Current CGPA, Completed Semesters, Total Semesters (4/6/8 selector), Target CGPA (slider 0–10)
    - Live result: required SGPA per remaining semester
    - Result banner: Achievable / Challenging (>9) / Not Achievable
    - Semester forecast grid: past = muted pill, future = required SGPA pill
- `src/components/ReappearCalculator/` — **three tabs:**
    - **Theory Only** — CA (25) + MTE (20) + ETE Theory (50); pass conditions; "X more marks needed"
    - **Theory + Practical** — CA + Theory MTE + Theory ETE + Practical ETE; three pass conditions
    - **Practical Only** — Practical CA + Practical ETE; two pass conditions
    - All `max` values are editable
    - `MarkInput.tsx` — numeric input component; extracted because it repeats across all three tabs
    - PASS/FAIL result panel inlined at bottom of each tab — it's a simple 3-field display, single-use per tab, no reason to extract

### How to test Phase 6

1. Goal Planner: enter same values as frontend → required SGPA must match exactly
2. Reappear: all three tabs → PASS/FAIL matches frontend for same inputs
3. Turn off network → both tools still work (no Firestore calls)

---

## Phase 7 — Leaderboard + Profile Sharing

**Goal:** Leaderboard with share card, full profile sharing UI matching frontend. **Stop — wait for your approval before Phase 8.**

### Files created

- `apps/mobile/src/app/(app)/(tabs)/leaderboard.tsx`
- `src/components/Leaderboard/`:
    - `LeaderboardView.tsx` — eligibility gate (`umsVerified`), opt-out state
    - UMS sync prompt inlined inside `LeaderboardView.tsx` — it's a single-use informational message shown in one place; no reason to extract
    - `LeaderboardTable.tsx` — FlatList; top 10 + nearby above + current user row highlighted
    - `LeaderboardRow.tsx` — rank badge (Trophy/Medal/text), shortened name via `shortenName()` from `@bhemu/shared`
    - `LeaderboardShareCard.tsx` — visual rank card (tier: gold #1, silver #2-3, bronze #4-10, default); rank, CGPA, percentile, achievement label, name, program, batch year
    - `ShareLeaderboardModal.tsx`:
        - Rank card preview
        - Share via **React Native Share API** (native sheet: WhatsApp, LinkedIn, X)
        - Copy link (`https://calc.bhemu.in/rank/{userId}_{profileId}`)
        - Download PNG via `react-native-view-shot`
        - Download PDF via `expo-print`
- `src/components/profile/ShareModal.tsx` and `ProfileDrawer.tsx` — already scaffolded in Phase 3; full sharing UI wired in this phase

### How to test Phase 7

1. UMS-synced user → leaderboard shows rank; opt-out toggle writes `optOut: true` to Firestore
2. Non-synced user → UMS sync prompt visible (inlined in `LeaderboardView.tsx`)
3. Rank card renders with correct tier styling
4. Share via native sheet → correct link
5. Download PNG → saved to device
6. Profile sharing: share by email → recipient sees in Shared With Me; toggle permission; remove share
7. Copy shared profile → appears in own profiles

---

## Phase 8 — Settings + Polish

**Goal:** Full Settings screen, smooth UX, loading/empty states, production build. **Stop — wait for your approval before shipping.**

### Files created

- `apps/mobile/src/app/(app)/(tabs)/settings.tsx`
- `src/components/Settings/`:
    - `AccountInfo.tsx` — gradient avatar with initials, inline name edit, account type badge, email verified status, member-since date
    - `SecuritySection.tsx` — Google-only: "Create Password"; password users: "Change Password" with re-auth; warning banner if no password
    - `LeaderboardSettings.tsx` — opt-out toggle (only visible if `umsVerified`)
    - `DangerZone.tsx` — "Delete Account": two-step modal → re-auth (password or Google) → wipe all Firestore data
- **Polish across all screens:**
    - Loading skeletons on Dashboard, GPA, Attendance, Leaderboard
    - Empty states: no profiles, no semesters, no attendance subjects
    - Pull-to-refresh on all list screens
    - Keyboard-aware `KeyboardAvoidingView` on all form screens
    - Haptic feedback on key actions (`expo-haptics`)
    - Tab bar with icons (Expo vector icons: home, calculator, clipboard, tools, trophy, settings)
    - `UMSExtensionModal` — info modal: extension is Chrome-only; `react-native-youtube-iframe` for embedded demo video

### How to test Phase 8

1. Change display name → updates Firebase Auth + Firestore
2. Create password on Google account → can now log in with email/password
3. Change password → re-auth required → new password works
4. Delete account → all Firestore data removed + Auth account deleted + redirects to sign-in
5. Pull-to-refresh on all screens → data refreshes
6. Keyboard-aware: all forms scroll above keyboard
7. Test on both iOS and Android in Expo Go
8. `pnpm typecheck` — all 5 workspaces clean
9. `pnpm test` — 48/48 shared tests pass
10. `pnpm lint` — clean

---

## Success Criteria (after Phase 8)

- [ ] All features match frontend: marks entry (2 modes), profiles, sharing, leaderboard, rank card share, attendance, reappear (3 modes), goal planner, settings, account deletion
- [ ] CGPA + marks calculations match frontend exactly for same data
- [ ] AsyncStorage persists active profile + view mode across restarts
- [ ] Rank card downloads as PNG and PDF
- [ ] Profile sharing (read/edit) works end-to-end
- [ ] All 5 workspaces typecheck clean
- [ ] 48/48 shared package tests pass
- [ ] `packages/firebase/` services used by both frontend and mobile (zero duplication)
- [ ] Zero modifications to `packages/shared/` during mobile build
- [ ] Standard Expo SDK 55 folder structure followed throughout

---

## Out of Scope

- UMS Sync — Chrome extension only; mobile shows a prompt directing users to the extension
- OG image generation (`/api/og`) — server-rendered, no mobile equivalent needed
- Public rank card SEO page (`/rank/[id]`) — web-only; mobile shares the web URL
- Push notifications — future feature
