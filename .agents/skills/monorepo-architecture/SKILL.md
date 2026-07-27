# Monorepo Architecture — Professional Reference

> Rules for keeping the bCampus monorepo structured, consistent, and maintainable across web, extension, and mobile apps.

### Project context

The `ums-extension` workspace is a Chrome MV3 extension that scrapes academic data (grades, marks, attendance) from LPU's UMS portal and syncs it directly into the same Firebase project used by the `frontend` web app. This is why `@bhemu/shared` contains types like `GPASubject`, `AttendanceData`, and grade utilities — they are the shared schema between what the extension writes and what the frontend reads. The extension is not a copy of a separate scraper project; it is an intentional data bridge for this monorepo.

---

## Table of Contents

1. [Core Philosophy](#1-core-philosophy)
2. [Workspace Layout](#2-workspace-layout)
3. [Turborepo Configuration](#3-turborepo-configuration)
4. [The Shared Package (`@bhemu/shared`)](#4-the-shared-package-bhemushaed)
5. [What Goes Where — Decision Tree](#5-what-goes-where--decision-tree)
6. [Dependency Rules](#6-dependency-rules)
7. [Package Naming & Configuration](#7-package-naming--configuration)
8. [Import Rules](#8-import-rules)
9. [Version Management](#9-version-management)
10. [Adding a New Feature — Checklist](#10-adding-a-new-feature--checklist)
11. [Adding a New Workspace](#11-adding-a-new-workspace)
12. [Deploying the Frontend to Vercel](#12-deploying-the-frontend-to-vercel)
13. [Anti-Patterns to Avoid](#13-anti-patterns-to-avoid)
14. [Quick Reference Card](#14-quick-reference-card)

---

## 1. Core Philosophy

> **Write logic once. Deploy it everywhere. Never copy-paste between workspaces.**

Every function, type, or constant that is used in more than one workspace must live in `@bhemu/shared`. No exceptions. If you catch yourself writing the same calculation in the extension that already exists in the frontend — stop. Move it to shared first.

Three questions before writing any code:

```
1. Is this logic already in @bhemu/shared?
   Yes → import it, done
   No  → does it need to run in multiple workspaces?
         Yes → add it to @bhemu/shared first
         No  → write it in the workspace-specific folder
```

---

## 2. Workspace Layout

Turborepo's standard convention: **apps go in `apps/`**, **shared packages go in `packages/`**.

```
Bhemu-Calculator/                  ← Monorepo root (no source code here)
├── package.json                   ← Root scripts (uses turbo), engines, shared devDeps
├── pnpm-workspace.yaml            ← Workspace definitions
├── turbo.json                     ← Turborepo task pipeline
├── .prettierrc                    ← Shared formatter config
├── .gitignore                     ← Root gitignore (includes .turbo/, dist/)
│
├── packages/
│   └── shared/                    ← @bhemu/shared (pure TypeScript, zero deps)
│       ├── package.json
│       ├── tsconfig.json
│       ├── tsup.config.ts
│       ├── src/
│       │   ├── index.ts           ← Master barrel export
│       │   ├── constants/         ← Raw data tables (GRADE_TABLE, etc.)
│       │   ├── types/             ← TypeScript interfaces only
│       │   ├── utils/             ← Pure functions on typed/clean data
│       │   └── parsers/           ← Functions that convert raw strings → typed objects
│       ├── dist/                  ← Build output (gitignored)
│       └── __tests__/             ← Unit tests (Vitest)
│
├── apps/
│   ├── frontend/                  ← Next.js 16 web app
│   │   ├── package.json           ← Depends on @bhemu/shared@workspace:*
│   │   └── src/
│   │
│   ├── ums-extension/             ← Plasmo Chrome MV3 extension
│   │   ├── package.json           ← Depends on @bhemu/shared@workspace:*
│   │   └── src/
│   │
│   └── mobile/                    ← React Native (Expo) app (future)
│       ├── package.json           ← Depends on @bhemu/shared@workspace:*
│       ├── metro.config.js        ← Configure watchFolders for shared package
│       └── src/
│
└── docs/                          ← Documentation only, no source code
```

### `pnpm-workspace.yaml`

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

Adding a new workspace means adding it under `apps/` — no change to this file needed as long as the new directory is inside `apps/`.

### What lives at the root

**Allowed at root:**
- `package.json` — workspace scripts (delegates to `turbo`), `engines`, `packageManager`, devDependencies shared across all workspaces (e.g. `turbo`, `concurrently`)
- `pnpm-workspace.yaml`
- `turbo.json`
- `.prettierrc`, `.eslintrc` (shared config files)
- `.gitignore`
- `README.md`, `CLAUDE.md`

**Never at root:**
- Source code files (`.ts`, `.tsx`)
- Test files
- Build output

---

## 3. Turborepo Configuration

This monorepo uses Turborepo as the task runner. It provides three things you cannot replicate cleanly with raw pnpm scripts:

- **Build ordering**: `turbo build` reads the `workspace:*` dependency graph and guarantees `@bhemu/shared` builds before any app workspace — zero manual chaining
- **Caching**: tasks are hashed by inputs (source files + env vars + config); a cache hit skips the task entirely and restores outputs from `.turbo/`
- **Parallelism**: after shared is built, `apps/frontend` and `apps/ums-extension` build concurrently without extra config

Turborepo is a **devDependency** at the root:

```bash
pnpm add turbo --save-dev -w
```

Add to root `.gitignore`:
```
.turbo/
```

### `turbo.json`

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**", ".plasmo/**", "build/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"],
      "outputs": []
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    }
  }
}
```

**Key concepts:**

| Field | Meaning |
|-------|---------|
| `"dependsOn": ["^build"]` | Build all workspace dependencies first. `^` means "run in dependency packages before this one." |
| `"dependsOn": []` (no `^`) | Run this task only after other tasks in the same package complete. |
| `"cache": false` | Never cache this task (dev servers produce no stable output). |
| `"persistent": true` | This task runs indefinitely (watch mode, dev server). Turbo won't wait for it to finish before running others. |
| `"outputs"` | Paths to cache. Only files listed here are restored from cache on a hit. |

### Root `package.json` scripts

```json
{
  "scripts": {
    "dev:web": "turbo dev --filter=./apps/frontend",
    "dev:ext": "turbo dev --filter=./apps/ums-extension",
    "build": "turbo build",
    "build:shared": "turbo build --filter=@bhemu/shared",
    "build:web": "turbo build --filter=./apps/frontend",
    "build:ext": "turbo build --filter=./apps/ums-extension",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "test": "turbo test --filter=@bhemu/shared"
  }
}
```

**`--filter` syntax:**
- `--filter=@bhemu/shared` — filter by package name
- `--filter=./apps/frontend` — filter by path
- `--filter=./apps/*` — all apps
- `--filter=./packages/*` — all packages

### How Turborepo determines build order

Given the dependency graph:
```
@bhemu/shared ← apps/frontend
@bhemu/shared ← apps/ums-extension
```

When you run `turbo build`:
1. Turbo reads `package.json` dependencies to find `workspace:*` references
2. `"dependsOn": ["^build"]` tells it to run `@bhemu/shared#build` before `apps/frontend#build`
3. `apps/frontend` and `apps/ums-extension` build in parallel after shared is done

You never need to manually order these again.

### Caching behaviour

Turbo hashes: source files, environment variables (declared in `turbo.json`), task config. On a cache hit, outputs are restored from `.turbo/` and the task is skipped entirely.

```bash
turbo build
# First run: builds everything, writes to cache
# Second run (no changes): "cache hit, replaying logs"

turbo build --force
# Ignore cache, rebuild everything
```

Cache is local by default. Vercel's remote cache can be added later for team/CI use — not needed now.

---

## 4. The Shared Package (`@bhemu/shared`)

### What `@bhemu/shared` is

A **pure TypeScript** package with absolutely zero runtime dependencies on React, Firebase, Next.js, Expo, or any platform-specific library. It must compile and run in:

- Next.js (browser + SSR)
- Chrome extension (background service worker)
- React Native (Metro bundler)
- Node.js (for tests, scripts)

### What belongs in `@bhemu/shared`

| Category | Folder | Examples |
|----------|--------|----------|
| **Constants** | `constants/` | `GRADE_TABLE`, `STANDARD_GRADE_TABLE`, `GRADE_TO_POINT` |
| **Types** | `types/` | `GPASubject`, `GPASemester`, `SubjectMarks`, `AttendanceData` |
| **Utils** | `utils/` | `calculateGPA()`, `calculateCGPA()`, `gradeToPoint()`, `computeGradeFromMarks()` |
| **Parsers** | `parsers/` | `parseProgram()`, `buildGroupKey()`, `deriveBatchYear()`, `shortenName()` |

### What does NOT belong in `@bhemu/shared`

| Category | Why it stays in the workspace |
|----------|-------------------------------|
| React components | Platform-specific rendering |
| Firebase services (`GPAService`, `AttendanceService`) | Different persistence strategies per platform |
| Firebase initialization (`config.ts`) | Different auth flows per platform |
| UI utilities (canvas, OG image generation) | Browser-only |
| UMS parsing logic | Extension-only |
| Context providers | React-specific |
| Auth flows | Platform-specific |

### `@bhemu/shared` internal structure

Four folders, each with a single clear role:

| Folder | Role | Rule |
|--------|------|------|
| `constants/` | Raw data tables — no logic, just values | Never contains functions |
| `types/` | TypeScript interfaces and type definitions only | Never contains values or logic |
| `utils/` | Pure functions that compute or transform **typed/clean** data | Input and output are typed; no string parsing |
| `parsers/` | Functions that convert **raw string/external data** into typed objects | Input is messy; output is a typed struct |

```
packages/shared/src/
├── index.ts              ← Master barrel export (re-exports everything below)
│
├── constants/
│   ├── index.ts
│   └── grades.ts         ← GRADE_TABLE, STANDARD_GRADE_TABLE, GRADE_TO_POINT, POINT_TO_GRADE, SELECTABLE_GRADES
│
├── types/
│   ├── index.ts
│   ├── gpa.ts            ← GPASubject, GPASemester, GPAProfile (no firebase/sharing fields)
│   ├── marks.ts          ← SubjectMarks, CustomCutoff, GradeTableEntry
│   ├── attendance.ts     ← AttendanceSubject, AttendanceData
│   └── leaderboard.ts    ← LeaderboardEntry, ParsedProgram
│
├── utils/
│   ├── index.ts
│   ├── gpa.ts            ← calculateGPA(), calculateCGPA()
│   ├── marks.ts          ← computeGradeFromMarks(), computeTotal(), lookupStandardGrade()
│   └── grades.ts         ← gradeToPoint(), pointToGrade()  (converters using constants/grades)
│
├── parsers/
│   ├── index.ts
│   └── program.ts        ← parseProgram(), buildGroupKey(), deriveBatchYear(), shortenName(), formatProgramLabel()
│
└── __tests__/
    ├── gpa.test.ts
    ├── marks.test.ts
    ├── grades.test.ts
    └── program.test.ts
```

**The split rule in one sentence per folder:**
- `constants/` — data you look up
- `types/` — shapes you enforce
- `utils/` — logic on clean data
- `parsers/` — logic on raw/string data

### Build requirement

`@bhemu/shared` must always produce **dual output** (ESM + CommonJS):
```
dist/
├── index.js      ← ESM (for Next.js, Expo)
├── index.cjs     ← CommonJS (for Jest, Node scripts)
└── index.d.ts    ← TypeScript declarations
```

Use `tsup` with `platform: 'neutral'` so the output works everywhere.

---

## 5. What Goes Where — Decision Tree

Use this before writing **any** piece of logic:

```
Is this code used (or likely to be used) in 2+ workspaces?
│
├── YES → It belongs in @bhemu/shared
│   │
│   ├── Type/interface only?                   → src/types/
│   ├── Raw data table (no logic)?             → src/constants/
│   ├── Pure function on clean/typed data?     → src/utils/
│   └── Function that parses raw strings?      → src/parsers/
│
└── NO → It belongs in the specific workspace
    │
    ├── apps/frontend/      → Next.js specific (SSR utilities, SEO, canvas, React contexts)
    ├── apps/ums-extension/ → Extension specific (UMS parsing, content scripts, background)
    └── apps/mobile/        → React Native specific (navigation, native APIs)
```

### Inside a workspace, where does code go?

```
Does it use React (hooks, JSX, context)?
├── YES → It's a component or context
│   ├── Used app-wide?         → src/contexts/
│   ├── Feature-specific?      → src/components/<feature>/
│   └── Layout/navigation?     → src/components/layout/
│
└── NO → It's a utility, service, or type
    ├── Used in 2+ workspaces? → packages/shared/ (not in this workspace at all)
    ├── Firebase CRUD?          → src/firebase/<service>.ts
    ├── Platform-specific util? → src/lib/<util>.ts
    └── Feature-only util?      → src/components/<feature>/lib/<util>.ts
```

---

## 6. Dependency Rules

### The allowed dependency graph

```
@bhemu/shared
    ↑ (imports from)
frontend     ums-extension     mobile
    ↑               ↑             ↑
(app code)    (extension)     (app code)
```

**Rules:**
- `@bhemu/shared` → imports **nothing** from any workspace
- `apps/frontend` → imports from `@bhemu/shared` only (not from extension or mobile)
- `apps/ums-extension` → imports from `@bhemu/shared` only (not from frontend or mobile)
- `apps/mobile` → imports from `@bhemu/shared` only (not from frontend or extension)
- **Cross-workspace imports are forbidden** (frontend importing from ums-extension, etc.)

### Layer import rules within `@bhemu/shared`

```
types/      →  imports nothing
constants/  →  imports nothing
utils/      →  may import from types/ and constants/ only
parsers/    →  may import from types/ and constants/ only
index.ts    →  re-exports from all four folders
```

Nothing inside `@bhemu/shared` may ever import from React, Firebase, Next.js, or any browser/Node API.

---

## 7. Package Naming & Configuration

### Package names

| Workspace | `name` in package.json |
|-----------|------------------------|
| Shared | `@bhemu/shared` |
| Frontend | `bhemu-calc` |
| Extension | `bhemu-ums-sync` |
| Mobile | `bhemu-mobile` (when added) |

All packages use **kebab-case**. No exceptions.

### Adding `@bhemu/shared` to a workspace

1. Add to `package.json` dependencies:
   ```json
   "@bhemu/shared": "workspace:*"
   ```
2. Add path alias to `tsconfig.json` — note the path is now **two levels up** because apps live in `apps/`:
   ```json
   "paths": {
     "@bhemu/shared": ["../../packages/shared/src"]
   }
   ```
3. Run `pnpm install` from the **root** (not from inside the workspace)

### `pnpm-workspace.yaml` must always include

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

New workspaces added under `apps/` are automatically picked up. No change to this file needed.

---

## 8. Import Rules

### In frontend / extension / mobile

```typescript
// ✅ Correct — import shared logic from the package
import { calculateGPA, calculateCGPA } from "@bhemu/shared";
import type { GPASubject, SubjectMarks } from "@bhemu/shared";

// ❌ Wrong — copy-pasting logic from one workspace to another
// (This means the function should be in @bhemu/shared)
import { calculateGPA } from "../../some-other-local-file-duplicating-shared-logic";

// ✅ Correct — workspace-specific logic uses its own alias
import { GPAService } from "@/firebase/gpaService";          // frontend
import { syncGradesAndMarks } from "~lib/firebaseSync";       // extension
```

### In `@bhemu/shared`

```typescript
// ✅ Correct — only relative imports between the four folders
import type { GPASemester } from "../types/gpa";
import { GRADE_TO_POINT } from "../constants/grades";

// ❌ Wrong — never import platform-specific packages
import { useState } from "react";                  // NO
import { getFirestore } from "firebase/firestore"; // NO
import { Platform } from "react-native";           // NO
```

### Barrel exports

Every subdirectory in `@bhemu/shared` must have an `index.ts` that re-exports its contents. This ensures consumers always import from the top-level `@bhemu/shared`:

```typescript
// ✅ One clean import
import { calculateGPA, GPASubject, GRADE_TABLE } from "@bhemu/shared";

// ❌ Deep imports are not supported and will break
import { calculateGPA } from "@bhemu/shared/utils/gpa";
```

---

## 9. Version Management

### Firebase version

**For JS SDK workspaces** (`apps/frontend`, `apps/ums-extension`): must use the **same major version**. Currently: `^12.x`. Upgrade both in the same commit — never let them diverge.

| Workspace | Firebase Package | Version |
|-----------|-----------------|---------|
| `@bhemu/shared` | none | — |
| `apps/frontend` | `firebase` (JS SDK) | `^12.x` |
| `apps/ums-extension` | `firebase` (JS SDK) | `^12.x` |
| `apps/mobile` | `@react-native-firebase/*` | independently versioned (currently ~20.x) |

**Mobile is a different case.** `@react-native-firebase` is an entirely separate package family with its own version numbers, unrelated to the JS SDK's `12.x`. The rule that must stay aligned across all three workspaces is not the SDK version — it's the **Firestore data schema and security rules** they all read and write against. If you change a Firestore collection structure or add a new field, update `docs/firestore-schema.md` and verify all three workspaces handle the change correctly.

### React version

React versions may differ between workspaces — this is acceptable because `@bhemu/shared` has zero React dependencies:

| Workspace | React Version | Reason |
|-----------|--------------|--------|
| `@bhemu/shared` | **none** | Pure TypeScript |
| `apps/frontend` | 19.x | Next.js 16 requirement |
| `apps/ums-extension` | 19.x | `plasmo` has no React peer dep; `@plasmohq/storage` accepts `^19.0.0` |
| `apps/mobile` | 19.x | Expo SDK 53+ ships React 19 alongside React Native 0.79; SDK 55 (current) includes React 19.2 |

All app workspaces run React 19. `@bhemu/shared` remains React-free.

**Extension note**: `plasmo` itself declares no peer dependency on React — `@plasmohq/storage` does, and it already accepts `^19`. The community concern about Plasmo's maintenance pace is still valid; **WXT** (Vite-based, actively maintained) is the preferred alternative for new extension projects in 2026. Keep Plasmo for now, but consider WXT on the next major extension refactor.

### TypeScript version

All workspaces should use the same TypeScript version. Currently: `^5.7`. The `@bhemu/shared` package is the reference — if its TypeScript compiles, all consumers should too.

### pnpm version

The root `package.json` pins the pnpm version via `packageManager`. Use **pnpm 10.x** (currently supported) or pnpm 11.x (latest):

```json
"packageManager": "pnpm@10.x.x"
```

**Do not use pnpm 8 or 9** — both are past end-of-life (pnpm 9 EOL: April 30, 2026) and no longer receive security patches. pnpm 10 and pnpm 11 are the currently supported releases as of mid-2026.

When updating the pnpm version:
1. Update `packageManager` in root `package.json`
2. Delete `pnpm-lock.yaml`
3. Run `pnpm install` from root
4. Verify all workspaces build: `turbo build`

---

## 10. Adding a New Feature — Checklist

When adding any new feature (e.g. "GPA Goal Planner v2"):

```
□ 1. Does this feature need new types?
      Yes → Add to @bhemu/shared/src/types/ if shared, or workspace src/types/ if not
      No  → Skip

□ 2. Does this feature need new calculation/utility logic?
      Yes → Add to @bhemu/shared/src/utils/ (pure functions on typed data)
             or @bhemu/shared/src/parsers/ (raw string → typed object)
             or @bhemu/shared/src/constants/ (new data tables)
             Or src/lib/ in the workspace if it's workspace-specific
      No  → Skip

□ 3. Are there unit tests for the new shared logic?
      All functions added to @bhemu/shared must have tests in packages/shared/__tests__/
      Run: turbo test --filter=@bhemu/shared

□ 4. Is @bhemu/shared built before running the workspace?
      Run: turbo build --filter=@bhemu/shared
      (turbo handles this automatically when you run turbo build or turbo dev)

□ 5. Does the feature exist only in web, and later needs to be in mobile?
      The business logic in @bhemu/shared already works on mobile — only UI needs to be built.

□ 6. Is the feature UI in the right place?
      Frontend:  apps/frontend/src/components/<FeatureName>/ (see react-architecture skill)
      Extension: apps/ums-extension/src/popup/ or src/tabs/
      Mobile:    apps/mobile/src/screens/ or src/components/

□ 7. If the feature modifies Firestore schema, is docs/firestore-schema.md updated?
```

---

## 11. Adding a New Workspace

When adding a new workspace (e.g. `apps/mobile/`):

```
□ 1. Create the directory under apps/
□ 2. pnpm-workspace.yaml already covers 'apps/*' — no change needed
□ 3. Create package.json with:
      - Correct workspace name (e.g. "bhemu-mobile")
      - "@bhemu/shared": "workspace:*" in dependencies
□ 4. Add TypeScript path alias: "@bhemu/shared": ["../../packages/shared/src"]
      Note: two levels up because the workspace is in apps/, not at root
□ 5. For React Native (Expo): configure Metro for pnpm workspace symlinks.
      pnpm uses symlinked node_modules; Metro's default resolver does not follow
      symlinks, which causes "@bhemu/shared" to silently fail to resolve.

      Option A — use expo/metro-config (recommended for Expo SDK 53+):
      ```js
      // apps/mobile/metro.config.js
      const { getDefaultConfig } = require('expo/metro-config');
      const path = require('path');

      const projectRoot = __dirname;
      const monorepoRoot = path.resolve(projectRoot, '../..');

      const config = getDefaultConfig(projectRoot);

      // Scope watchFolders tightly — only the directories mobile actually needs.
      // Do NOT point at monorepoRoot: that watches apps/frontend/, docs/, and everything
      // else, causing Metro to index the entire repo on every change.
      config.watchFolders = [
        path.resolve(monorepoRoot, 'packages'),  // @bhemu/shared and any future packages
      ];

      // Help Metro find packages that live in the root node_modules
      config.resolver.nodeModulesPaths = [
        path.resolve(projectRoot, 'node_modules'),
        path.resolve(monorepoRoot, 'node_modules'),
      ];

      // unstable_enableSymlinks: pnpm uses symlinks for workspace packages.
      // Expo SDK 53+ enables this by default, so this line is defensive rather than
      // load-bearing — safe to keep, just not the critical fix it once was.
      config.resolver.unstable_enableSymlinks = true;

      module.exports = config;
      ```

      Option B — plain Metro (non-Expo):
      Same config but use `require('@react-native/metro-config')` instead of expo.

      Verify resolution works:
      ```bash
      cd apps/mobile
      node -e "require.resolve('@bhemu/shared')"
      # Should print the resolved path without error
      ```

□ 6. Run pnpm install from root (not from inside workspace)
□ 7. Add workspace scripts to root package.json:
      "dev:mobile": "turbo dev --filter=./apps/mobile"
      "build:mobile": "turbo build --filter=./apps/mobile"
□ 8. Add output paths to turbo.json if the new workspace has non-standard build output
□ 9. Verify @bhemu/shared imports resolve: import { calculateGPA } from '@bhemu/shared'
```

---

## 12. Deploying the Frontend to Vercel

Vercel supports pnpm workspaces natively. Three settings to configure in the Vercel project dashboard:

| Setting | Value |
|---------|-------|
| **Root Directory** | `apps/frontend` |
| **Include files outside the Root Directory** | ✅ **must be enabled** |
| **Build Command** | `pnpm build` (default, no change) |
| **Install Command** | leave blank (Vercel auto-detects pnpm workspace and runs from repo root) |

**The "Include files outside the Root Directory" toggle is not optional.** When Root Directory is set to `apps/frontend`, Vercel scopes the build container to that subfolder only. Without this toggle, `packages/shared/` is not present in the filesystem at build time, and Next.js fails with a `Module not found: @bhemu/shared` error. Enable it in: Project Settings → General → Root Directory → tick "Include files outside the Root Directory in the Build Step."

**Why `@bhemu/shared` doesn't need a pre-build step on Vercel:**
Next.js resolves `@bhemu/shared` via the `tsconfig.json` path alias (`"@bhemu/shared": ["../../packages/shared/src"]`), which points directly to the TypeScript source. The `dist/` output (which is gitignored) is not used during the Next.js build. No extra build command needed — but `packages/shared/src/` must be in the filesystem (hence the toggle above).

**Environment variables:**
Add all `NEXT_PUBLIC_*` Firebase config vars in the Vercel project dashboard (Settings → Environment Variables). These are not in the repo.

**If you ever add a pre-build step** (e.g. you change tsconfig to use `dist/` instead of `src/`):
```
Build Command: pnpm --filter '@bhemu/shared' build && pnpm build
```

---

## 13. Anti-Patterns to Avoid

| Anti-Pattern | What it looks like | Fix |
|--------------|-------------------|-----|
| **Cross-workspace duplication** | `programUtils.ts` exists in both frontend and extension | Move to `@bhemu/shared`, delete duplicates |
| **App not in `apps/`** | `frontend/` or `mobile/` at the repo root | Move to `apps/frontend/`, `apps/mobile/` |
| **Deep imports from shared** | `import x from "@bhemu/shared/utils/gpa"` | Always import from `"@bhemu/shared"` top-level |
| **React in shared** | `import { useState } from "react"` inside `packages/shared/src/` | Move to workspace-specific file |
| **Firebase in shared** | `import { getFirestore } from "firebase/firestore"` in shared | Move to workspace-specific firebase service |
| **Cross-workspace imports** | Frontend importing from `apps/ums-extension/src/` | Extract shared logic to `@bhemu/shared` instead |
| **Installing from workspace subfolder** | `cd apps/frontend && pnpm install` | Always run `pnpm install` from root |
| **Root source code** | TypeScript files at repo root | All source code lives inside a workspace |
| **Unversioned shared changes** | Changing `@bhemu/shared` without rebuilding | `turbo build --filter=@bhemu/shared` rebuilds automatically |
| **Diverged Firebase JS SDK versions** | `apps/frontend` and `apps/ums-extension` on different major versions | Both must stay on the same major version (currently `^12.x`); mobile uses `@react-native-firebase` which is versioned separately |
| **No tests for shared logic** | Adding functions to `@bhemu/shared` without tests | Every exported function needs a test |
| **Platform-specific polyfills in shared** | `typeof window !== 'undefined'` checks in shared | Keep platform detection in workspace code |
| **Skipping `turbo.json` outputs** | New build artifacts not listed in `outputs` | Add artifact paths to prevent stale cache restores |

---

## 14. Quick Reference Card

```
Before writing any logic:

1. Already in @bhemu/shared?
   Yes → import it. Done.

2. Needed in 2+ workspaces?
   Yes → pick the right folder:
           type/interface only?           → src/types/
           raw data table?                → src/constants/
           pure fn on clean data?         → src/utils/
           fn that parses raw strings?    → src/parsers/
         write unit tests in __tests__/
         run: turbo build --filter=@bhemu/shared  (or just turbo build — it handles order)
         import from "@bhemu/shared" everywhere

3. Workspace-specific only?
   Yes → write it inside the workspace
         frontend:   apps/frontend/src/lib/, src/firebase/, src/components/
         extension:  apps/ums-extension/src/lib/, src/parsers/, src/utils/
         mobile:     apps/mobile/src/lib/, src/screens/

4. Touching @bhemu/shared?
   Always: turbo build (builds shared first, then dependents)
   Always: update tests in packages/shared/__tests__/
   Always: update the barrel export in packages/shared/src/index.ts
   Always: update the subfolder's index.ts (constants/, types/, utils/, or parsers/)

Folder rule:
  apps/          → all runnable workspaces (web, extension, mobile)
  packages/      → shared libraries (@bhemu/shared; add more as needed)
  docs/          → documentation only, no source
  root           → config files only (turbo.json, pnpm-workspace.yaml, package.json)

Dependency direction:
  @bhemu/shared  ←  apps/frontend
  @bhemu/shared  ←  apps/ums-extension
  @bhemu/shared  ←  apps/mobile
  (shared never imports from any workspace)
  (workspaces never import from each other)

Version rule:
  Firebase JS SDK (frontend, extension): same major version (^12.x)
  Mobile Firebase: @react-native-firebase — independently versioned, not ^12.x
  What must stay aligned across all three: Firestore schema + security rules
  React: all app workspaces on 19.x; @bhemu/shared has none
  TypeScript: same version across all workspaces

Turborepo task order (automatic via turbo.json dependsOn):
  1. @bhemu/shared#build  (always first, because apps depend on it)
  2. apps/* builds        (in parallel, after shared)

Root scripts:
  pnpm dev:web         → turbo dev --filter=./apps/frontend
  pnpm dev:ext         → turbo dev --filter=./apps/ums-extension
  pnpm build           → turbo build (all workspaces, correct order)
  pnpm build:shared    → turbo build --filter=@bhemu/shared
  pnpm build:web       → turbo build --filter=./apps/frontend
  pnpm build:ext       → turbo build --filter=./apps/ums-extension
  pnpm test            → turbo test --filter=@bhemu/shared
  pnpm typecheck       → turbo typecheck
  pnpm lint            → turbo lint
```

---

> **Target:** pnpm workspaces · Turborepo · TypeScript · Next.js · Plasmo · React Native (Expo) · Firebase
