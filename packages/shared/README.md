# @bhemu/shared

Shared types, constants, utilities, and parsers for the bCampus monorepo. Zero runtime dependencies — runs in Next.js, Chrome extension service workers, React Native, and Node.js.

## Usage

```ts
import {
  calculateGPA,
  calculateCGPA,
  computeGradeFromMarks,
  gradeToPoint,
  pointToGrade,
  parseProgram,
  formatChatTime,
  formatChatDate,
  mergeChatMessages,
  GRADE_TABLE,
  GRADE_TO_POINT,
} from "@bhemu/shared";
import type { GPASubject, GPASemester, SubjectMarks } from "@bhemu/shared";
import type { ChatMessage, ChatRoom } from "@bhemu/shared";
```

Always import from `"@bhemu/shared"` — never from deep paths like `"@bhemu/shared/utils/gpa"`.

## Internal structure

```
src/
├── constants/   Grade, UMS, storage, and chat protocol limits
├── types/       TypeScript interfaces for academic data, UMS, sharing, and chat
├── utils/       Pure GPA, marks, time, ranking, and chat helpers
├── parsers/     Functions that parse raw strings → typed objects (parseProgram, etc.)
└── index.ts     Master barrel export
```

### Chat helpers

The shared package keeps web and mobile chat behavior consistent. It provides chat types, timestamp parsing/formatting, date separators, author grouping, initials/avatar helpers, reaction summaries, deterministic message sorting, optimistic-message IDs, and server/cache message merging. The current mobile cache limit is exposed as `MAX_CHAT_CACHED_MESSAGES` and is set to 100.

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
