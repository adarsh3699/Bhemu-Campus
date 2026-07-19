# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Skills to load

When working on **workspace structure, adding packages, imports between workspaces, version management, or deployment**:
→ Load `.agents/skills/monorepo-architecture/SKILL.md`

When working on **React components, hooks, contexts, or frontend file structure**:
→ Load `.agents/skills/react-architecture/SKILL.md`

---

## Repository Layout

This is a **pnpm monorepo**. There is no source code at the root — each workspace is self-contained:

```
Bhemu-Calculator/
├── packages/
│   └── shared/        — @bhemu/shared: shared types, utilities, constants (pure TypeScript, zero deps)
├── frontend/          — Next.js 16 web app (React 19, Firebase 12)
├── ums-extension/     — Plasmo Chrome MV3 extension (React 19, Firebase 12)
├── docs/              — Firestore schema, design docs, SEO guide
└── test/              — Firebase Admin SDK credential (not a test suite)
```

## Commands

### Root workspace
```bash
pnpm dev:web        # Start frontend dev server
pnpm dev:ext        # Start extension dev server
pnpm build:shared   # Build @bhemu/shared (run this before any workspace build)
pnpm build:web      # build:shared + frontend build
pnpm build:ext      # build:shared + extension build
pnpm test           # Run @bhemu/shared unit tests
pnpm typecheck      # Type-check all workspaces
```

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

### Shared package (`cd packages/shared`)
```bash
pnpm build     # Build ESM + CJS + type declarations
pnpm test      # Run Vitest unit tests
pnpm typecheck # Type-check without emit
```

---

## Architecture

### Tech Stack
- **Shared**: Pure TypeScript, tsup (ESM + CJS), Vitest
- **Frontend**: Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS v4, Firebase 12, Recharts
- **Extension**: Plasmo 0.90.5, React 19, Firebase 12, linkedom
- **Package manager**: pnpm workspaces

### Shared Package (`@bhemu/shared`)

Zero dependencies. Exports all types and pure utility functions used across workspaces:
- **Types**: `GPASubject`, `GPASemester`, `GPAProfile`, `SubjectMarks`, `AttendanceData`, `LeaderboardEntry`, `ParsedProgram`
- **Utilities**: `calculateGPA()`, `calculateCGPA()`, `computeGradeFromMarks()`, `computeTotal()`, `parseProgram()`, `gradeToPoint()`
- **Constants**: `GRADE_TABLE`, `STANDARD_GRADE_TABLE`, `GRADE_TO_POINT`

Import from `@bhemu/shared` in all workspaces. Never duplicate shared logic locally.

### Frontend Architecture

Pure client-side app — no backend API. All reads/writes go directly from the browser to Firestore.

**Provider hierarchy** (in `src/app/layout.tsx`):
```
AuthContext → MessageContext → GpaDataContext → AttendanceDataContext → MarksDataContext → AppShell
```

**`AppShell`** (`src/components/layout/AppShell.tsx`) renders SideBar + TopBar + ProfileDrawer for authenticated routes. Routes in `NO_LAYOUT_PATHS` render without the shell.

### State Management

React Context + hooks only — no Redux or Zustand.

| Context | File | Responsibility |
|---|---|---|
| `AuthContext` | `src/firebase/AuthContext.tsx` | Firebase auth, Google OAuth, account deletion |
| `MessageContext` | `src/contexts/MessageContext.tsx` | Toast notifications via `useMessage()` |
| `GpaDataContext` | `src/contexts/GpaDataContext.tsx` | Profiles, semesters — real-time Firestore `onSnapshot` |
| `AttendanceDataContext` | `src/contexts/AttendanceDataContext.tsx` | Attendance data for the active profile |
| `MarksDataContext` | `src/contexts/MarksDataContext.tsx` | Derived marks view over GpaDataContext semesters |

Key patterns:
- Active profile ID persisted to `localStorage` key `bhemu_activeProfileId`
- `updateSemesters` uses optimistic updates: local state set immediately before Firestore write
- Shared profiles with `permission="edit"` write via `saveProfileWithCollaboration` into the owner's subcollection

### Firebase Layer

- `src/firebase/config.ts` — exports `auth`, `db`, `googleProvider`
- `src/firebase/AuthContext.tsx` — full auth service with batch Firestore cleanup on account deletion
- `src/firebase/gpaService.ts` — `GPAService` class: profile/semester CRUD, sharing, real-time listeners
- `src/firebase/attendanceService.ts` — `AttendanceService` class: flat attendance doc per profile

Firestore schema: `docs/firestore-schema.md`

### UMS Extension

The extension scrapes LPU's UMS portal and writes academic data directly into the same Firebase project as the frontend. It is not a standalone tool — it is a data bridge.

Entry points:
- `src/background/index.ts` — Service worker; orchestrates UMS fetch + Firestore sync
- `src/contents/authBridge.ts` — Content script; bridges Firebase auth token from the web app to the extension
- `src/popup/index.tsx` — Extension popup UI

### Deployment

Frontend deploys to Vercel. Critical: set Root Directory to `frontend` AND enable "Include files outside the Root Directory in the Build Step" — without this toggle, Vercel cannot find `packages/shared/` and the build fails. See `.agents/skills/monorepo-architecture/SKILL.md` section 11 for full instructions.
