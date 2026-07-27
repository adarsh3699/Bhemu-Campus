# 🎓 bCampus

> Complete academic companion for LPU students — GPA tracking, marks analysis, attendance monitoring, and smart planning tools.

[![Live Demo](https://img.shields.io/badge/Live-campus.bhemu.in-blue)](https://campus.bhemu.in)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-Private-red)]()

## 📋 Overview

bCampus is an all-in-one academic toolkit designed specifically for LPU students. Track your GPA/CGPA, analyze marks breakdowns, monitor attendance, plan reappear strategies, and sync data directly from UMS — all in one place, cloud-synced and shareable.

🔗 **Live:** [campus.bhemu.in](https://campus.bhemu.in)

---

## ✨ Key Features

### 📊 Academic Tools

- **GPA & CGPA Calculator** — Semester-wise grade tracking with automatic cumulative GPA computation
- **Marks Analysis** — Detailed CA, Mid-term, End-term & attendance breakdowns with grade predictions
- **Attendance Tracker** — Smart calculator showing exactly how many classes you can miss or need to attend
- **Goal Planner** — Set target CGPA and see required grades for each upcoming semester
- **Reappear Calculator** — Simulate reappear outcomes and plan improvement strategies

### 🔄 UMS Integration

- **One-Click Sync** — Chrome extension auto-imports grades, marks & attendance from LPU UMS
- **No Manual Entry** — All data fetched directly from the portal
- **Always Fresh** — Re-sync anytime to get latest results as they're declared

### 👥 Collaboration

- **Profile Sharing** — Share academic profiles with classmates for study groups
- **Real-time Sync** — Collaborative editing with live Firebase updates
- **Multiple Workspaces** — Create separate profiles for different academic contexts

### 🏆 Leaderboard

- **CGPA Rankings** — See where you stand among batchmates
- **Program-wise** — Compare within your branch and batch year
- **Shareable Rank Cards** — Generate beautiful rank cards to share your achievements

---

## 🏗️ Monorepo Structure

pnpm workspaces + Turborepo. All apps live under `apps/`, all shared packages under `packages/`.

```
Bhemu-Campus/
├── package.json           # Root workspace (turbo scripts, engines)
├── pnpm-workspace.yaml    # Workspace definitions
├── turbo.json             # Turborepo task pipeline
│
├── packages/
│   └── shared/            # @bhemu/shared — pure TypeScript, zero deps
│       └── src/
│           ├── constants/ # Grade tables (GRADE_TABLE, GRADE_TO_POINT, …)
│           ├── types/     # Shared interfaces (GPASubject, SubjectMarks, …)
│           ├── utils/     # Pure functions (calculateGPA, gradeToPoint, …)
│           └── parsers/   # String → struct parsers (parseProgram, …)
│
├── apps/
│   ├── frontend/          # Next.js 16 web app (React 19, Firebase 12)
│   └── ums-extension/     # Plasmo Chrome MV3 extension (React 19, Firebase 12)
│
└── docs/                  # Documentation (firestore-schema, design decisions)
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+
- **pnpm** 10+ (`npm install -g pnpm`)
- **Firebase Project** (for Auth & Firestore)

### Installation

```bash
# Clone the repository
git clone https://github.com/adarsh3699/Bhemu-Calculator.git
cd Bhemu-Calculator

# Install all workspace dependencies from root
pnpm install

# Setup environment variables
cp apps/frontend/.env.example apps/frontend/.env
# Edit .env with your Firebase config

# Start frontend dev server
pnpm dev:web
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Chrome Extension Setup

```bash
# Start extension dev server (from repo root)
pnpm dev:ext

# Or from inside the workspace
cd apps/ums-extension
pnpm dev              # Development build with watch mode
pnpm build            # Production build
pnpm package          # Build + zip for Chrome Web Store
```

Load unpacked extension in Chrome from `apps/ums-extension/build/chrome-mv3-dev`.

---

## 🛠️ Tech Stack

### Frontend

| Category            | Technology                         |
| ------------------- | ---------------------------------- |
| **Framework**       | Next.js 16 (App Router, Turbopack) |
| **Language**        | TypeScript 5.0                     |
| **UI Library**      | React 19                           |
| **Styling**         | Tailwind CSS v4                    |
| **Icons**           | Lucide React                       |
| **Charts**          | Recharts                           |
| **Backend**         | Firebase (Firestore, Auth)         |
| **Package Manager** | pnpm                               |

### Chrome Extension

| Category      | Technology                  |
| ------------- | --------------------------- |
| **Framework** | Plasmo 0.90.5 (Chrome MV3)  |
| **Language**  | TypeScript                  |
| **UI**        | React                       |
| **Backend**   | Firebase 12 (JS SDK)        |
| **Parser**    | linkedom (DOM manipulation) |

---

## 📂 Architecture

### Frontend Architecture

- **Pure Client-Side** — No backend API, all data flows directly to Firestore from browser
- **Context-Based State** — React Context hooks for global state (Auth, GPA, Marks, Attendance)
- **Co-located Hooks** — Feature-specific hooks live alongside their components
- **Server Components** — Next.js App Router with RSC for SEO-critical pages
- **Real-time Listeners** — Firebase `onSnapshot` for live collaboration

### Chrome Extension Architecture

- **Service Worker** — Background script orchestrates UMS fetch + Firebase sync
- **Auth Bridge** — Content script bridges Firebase token from web app to extension
- **Direct Firestore Writes** — Extension writes parsed UMS data using same user auth

See [CLAUDE.md](./CLAUDE.md) for detailed architecture docs.

---

## 📜 Available Scripts

### Root (Turborepo — run from repo root)

| Command             | Description                                    |
| ------------------- | ---------------------------------------------- |
| `pnpm dev:web`      | Start frontend dev server                      |
| `pnpm dev:ext`      | Start extension dev server                     |
| `pnpm build`        | Build all workspaces (correct order via turbo) |
| `pnpm build:shared` | Build `@bhemu/shared` only                     |
| `pnpm build:web`    | Build frontend (shared builds first)           |
| `pnpm build:ext`    | Build extension (shared builds first)          |
| `pnpm typecheck`    | Type-check all workspaces                      |
| `pnpm lint`         | Lint all workspaces                            |
| `pnpm test`         | Run `@bhemu/shared` unit tests                 |

### Frontend (`cd apps/frontend`)

| Command      | Description                                |
| ------------ | ------------------------------------------ |
| `pnpm dev`   | Start dev server with Turbopack            |
| `pnpm build` | Production build                           |
| `pnpm start` | Serve production build                     |
| `pnpm lint`  | Run ESLint                                 |
| `pnpm clean` | Remove `.next` + `node_modules`, reinstall |

### UMS Extension (`cd apps/ums-extension`)

| Command         | Description                      |
| --------------- | -------------------------------- |
| `pnpm dev`      | Plasmo dev (watch mode)          |
| `pnpm build`    | Production build                 |
| `pnpm package`  | Build + zip for Chrome Web Store |
| `pnpm lint`     | ESLint                           |
| `pnpm lint:fix` | ESLint with auto-fix             |

---

## 🔐 Environment Variables

### Frontend `.env`

```env
# Firebase Config
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

# Optional
NEXT_PUBLIC_GA_MEASUREMENT_ID=
```

### Extension `.env`

```env
PLASMO_PUBLIC_FIREBASE_API_KEY=
PLASMO_PUBLIC_FIREBASE_AUTH_DOMAIN=
PLASMO_PUBLIC_FIREBASE_PROJECT_ID=
PLASMO_PUBLIC_FIREBASE_STORAGE_BUCKET=
PLASMO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
PLASMO_PUBLIC_FIREBASE_APP_ID=
```

---

## 🤝 Contributing

This is a private project. Contributions are currently not accepted.

---

## 👤 Author

**Adarsh Suman**

- 🌐 Portfolio: [adarshsuman.in](https://www.adarshsuman.in)
- 💼 LinkedIn: [adarsh3699](https://www.linkedin.com/in/adarsh3699/)
- 🐙 GitHub: [@adarsh3699](https://github.com/adarsh3699)
- 🎥 YouTube: [@CodingWithBhemu](https://www.youtube.com/@CodingWithBhemu)

---

## 📄 License

This project is private and proprietary. All rights reserved.

---

## 🙏 Acknowledgments

- Built for LPU students by an LPU student
- Inspired by the need for better academic tracking tools
- Powered by Firebase for real-time collaboration

---

<div align="center">
  <sub>Made with ❤️ for LPU Students</sub>
</div>
