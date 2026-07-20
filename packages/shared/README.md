# @bhemu/shared

Shared types, constants, utilities, and parsers for the Bhemu Calculator monorepo. Zero runtime dependencies — runs in Next.js, Chrome extension service workers, React Native, and Node.js.

## Usage

```ts
import {
  calculateGPA,
  calculateCGPA,
  computeGradeFromMarks,
  gradeToPoint,
  pointToGrade,
  parseProgram,
  GRADE_TABLE,
  GRADE_TO_POINT,
} from "@bhemu/shared";
import type { GPASubject, GPASemester, SubjectMarks } from "@bhemu/shared";
```

Always import from `"@bhemu/shared"` — never from deep paths like `"@bhemu/shared/utils/gpa"`.

## Internal structure

```
src/
├── constants/   Raw data tables (GRADE_TABLE, GRADE_TO_POINT, etc.)
├── types/       TypeScript interfaces only (GPASubject, SubjectMarks, etc.)
├── utils/       Pure functions on typed data (calculateGPA, gradeToPoint, etc.)
├── parsers/     Functions that parse raw strings → typed objects (parseProgram, etc.)
└── index.ts     Master barrel export
```

## Commands

```bash
pnpm build      # Build ESM + CJS + type declarations to dist/
pnpm test       # Run Vitest unit tests
pnpm typecheck  # Type-check without emit
```

## Rules

- No React, Firebase, Next.js, or platform-specific imports — ever
- Every exported function must have a test in `__tests__/`
- Always import from the top-level `"@bhemu/shared"` in consumer workspaces
