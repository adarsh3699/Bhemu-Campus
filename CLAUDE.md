# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Layout

This is a monorepo with no root `package.json`. Each workspace is independent:

- `frontend/` — Next.js 16 web app (the primary product)
- `ums-extension/` — Plasmo-based Chrome MV3 extension for importing UMS data
- `docs/` — Design docs, Firestore schema, SEO guide
- `test/` — Firebase Admin SDK service account credential (not a test suite)

## Commands

### Frontend (`cd frontend`)
```bash
pnpm dev       # Start dev server with Turbopack
pnpm build     # Production build
pnpm start     # Serve production build
pnpm lint      # Run ESLint
pnpm clean     # Remove .next + node_modules, then reinstall
```

### UMS Extension (`cd ums-extension`)
```bash
pnpm dev       # plasmo dev (watch mode)
pnpm build     # plasmo build
pnpm package   # Build + zip for Chrome Web Store
pnpm lint      # ESLint
pnpm lint:fix  # ESLint with auto-fix
```

There is no test runner configured in either workspace.

## Architecture

### Tech Stack
- **Frontend**: Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS v4, Firebase 12, Recharts
- **Extension**: Plasmo 0.90.5, Firebase 10, linkedom
- **Package manager**: pnpm (both workspaces)

### Frontend Architecture

A pure client-side app — there is no backend API. All data reads/writes go directly from the browser to Firestore via the Firebase JS SDK.

**Provider hierarchy** (established in `src/app/layout.tsx`):
```
AuthContext → MessageContext → GpaDataContext → AttendanceDataContext → MarksDataContext → AppShell
```

**`AppShell`** (`src/components/layout/AppShell.tsx`) renders the `SideBar` + `TopBar` + `ProfileDrawer` for authenticated routes. Routes listed in `NO_LAYOUT_PATHS` (landing, auth pages) render without this shell.

### State Management

Managed exclusively via React Context + hooks — no Redux or Zustand.

| Context | File | Responsibility |
|---|---|---|
| `AuthContext` | `src/firebase/AuthContext.tsx` | Firebase user auth, Google OAuth, account deletion |
| `MessageContext` | `src/components/common/MessageProvider.tsx` | Toast notifications via `useMessage()` |
| `GpaDataContext` | `src/hooks/GpaDataContext.tsx` | Profiles, active profile, semesters — real-time Firestore `onSnapshot` |
| `AttendanceDataContext` | `src/hooks/AttendanceDataContext.tsx` | Attendance data for the active profile |
| `MarksDataContext` | `src/hooks/MarksDataContext.tsx` | Derived marks view over `GpaDataContext` semesters |

Key patterns:
- `GpaDataContext` manages Firestore `onSnapshot` listeners for profiles, semesters, incoming shares, and collaborative edits. Listeners are cleaned up on unmount/logout.
- Active profile ID is persisted to `localStorage` key `bhemu_activeProfileId`.
- `updateSemesters` uses optimistic updates: local state is set immediately before the Firestore write.
- Shared profiles with `permission="edit"` write through `saveProfileWithCollaboration` into the owner's Firestore subcollection, enabling real-time collaboration.

### Firebase Layer

- `src/firebase/config.ts` — Exports `auth`, `db`, `googleProvider`
- `src/firebase/AuthContext.tsx` — Full auth service with batch Firestore cleanup on account deletion
- `src/firebase/gpaService.ts` — `GPAService` class: profile/semester CRUD, sharing, real-time listeners
- `src/firebase/attendanceService.ts` — `AttendanceService` class: flat attendance doc per profile

The Firestore schema is documented in `docs/firestore-schema.md`.

### Feature Hooks

Each major feature has a dedicated logic hook co-located with its components:
- `src/components/GpaCalculator/hooks/useGpaCalculator.ts` — Calculator logic
- `src/components/GpaCalculator/hooks/useMarksAnalysis.ts` — Marks analysis
- `src/components/AttendanceCalculator/hooks/useAttendanceCalculator.ts` — Attendance logic

### Utilities and Types

- `src/lib/gpaUtils.ts` — `calculateGPA()`, `calculateCGPA()`
- `src/lib/marksUtils.ts` — `computeGradeFromMarks()`, `computeTotal()`
- `src/lib/grades.ts` — Grade table definitions
- `src/types/` — Central type definitions; `src/types/index.ts` re-exports all types
- `src/lib/seo.ts` — Page metadata and JSON-LD helpers

### UMS Extension

Entry points:
- `src/background/index.ts` — Service worker; orchestrates UMS fetch + Firebase sync
- `src/contents/authBridge.ts` — Content script; bridges Firebase auth token from the web app to the extension
- `src/popup/index.tsx` — Extension popup UI

The extension writes parsed UMS data directly into the same Firestore project as the web app, using the same auth token obtained via `authBridge.ts`.
