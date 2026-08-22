# 🎓 bCampus

> Academic companion for LPU students — calculators, UMS sync, real-time campus chat, notifications, and shareable academic profiles.

[![Live Demo](https://img.shields.io/badge/Live-campus.bhemu.in-blue)](https://campus.bhemu.in)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-Private-red)]()

## 📋 Overview

bCampus is an all-in-one academic toolkit designed specifically for LPU students. Track GPA/CGPA, analyze marks, monitor attendance, plan reappear strategies, sync data from UMS, and chat with your campus community from the web or mobile app.

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

- **Web Extension Sync** — Import grades, marks, attendance, student information, and term data directly from LPU UMS
- **Mobile UMS Sync** — Native WebView-based sync with cookie/session support and a manual Cloudflare verification fallback when UMS challenges the embedded browser
- **Safe Resume Flow** — After verification or login, sync resumes in the background; the UMS screen remains available when manual login is required
- **Additional UMS Data** — The sync pipeline supports announcements, messages, timetable, and seating-plan data where available

### 💬 Campus Chat (Beta)

- **University and Batchmate Rooms** — Room availability follows the signed-in student's profile and batch
- **Real-time Messaging** — Shared web/mobile client backed by a Cloudflare Worker, WebSockets, and Durable Objects
- **Modern Chat Actions** — Replies, reactions, message editing/deletion, reporting, presence, and date separators
- **Fast Startup** — Mobile caches the latest 100 messages per room and merges cached data with live updates

### 📱 Mobile App & Updates

- **Expo Android/iOS App** — Home, GPA, attendance, goal planner, reappear calculator, leaderboard, UMS data screens, chat, settings, and notifications
- **Release Checks** — The app reads one release manifest from the website and can download a backup Android APK when needed
- **Single Release Source** — Website update metadata is defined in `apps/frontend/src/lib/mobileRelease.ts` and served at `/mobile/update.json`

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
│   ├── shared/            # @bhemu/shared — pure TypeScript types, parsers, calculators, and chat helpers
│   ├── chat/              # @bhemu/chat — shared chat API client and protocol constants
│   └── firebase/          # @bhemu/firebase — shared Firebase academic data services
│
│   # @bhemu/shared internals
│   └── shared/src/
│       ├── constants/     # Grade, UMS, storage, and chat constants
│       ├── types/         # Shared academic, UMS, and chat interfaces
│       ├── utils/         # Pure calculators and chat helpers
│       └── parsers/       # String → struct parsers (parseProgram, …)
│
├── apps/
│   ├── frontend/          # Next.js 16 web app (React 19, Firebase 12)
│   ├── mobile/            # Expo SDK 57 React Native app
│   ├── ums-extension/     # Plasmo Chrome MV3 UMS sync extension
│   └── chat-worker/       # Hono + Cloudflare Durable Objects chat backend
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

# Start the mobile app
pnpm dev:mobile

# Run the local chat Worker (optional)
cd apps/chat-worker && pnpm dev
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

### Mobile App Setup

```bash
cd apps/mobile
pnpm start

# Native development builds
pnpm android
pnpm ios
```

See [`apps/mobile/README.md`](./apps/mobile/README.md) and [`docs/mobile-updates.md`](./docs/mobile-updates.md) for mobile builds and releases.

---

## 🛠️ Tech Stack

### Web Frontend

| Category            | Technology                         |
| ------------------- | ---------------------------------- |
| **Framework**       | Next.js 16 (App Router, Turbopack) |
| **Language**        | TypeScript 6                       |
| **UI Library**      | React 19                           |
| **Styling**         | Tailwind CSS v4                    |
| **Icons**           | Lucide React                       |
| **Charts**          | Recharts                           |
| **Backend**         | Firebase (Firestore, Auth)         |
| **Package Manager** | pnpm                               |

### Mobile App

| Category            | Technology                         |
| ------------------- | ---------------------------------- |
| **Framework**       | Expo SDK 57, React Native 0.86     |
| **Routing**         | Expo Router                        |
| **Native WebView**  | react-native-webview 13.16         |
| **Updates**         | Expo Updates + APK fallback        |
| **Notifications**   | Expo Notifications                 |

### Chat Backend

| Category            | Technology                         |
| ------------------- | ---------------------------------- |
| **Runtime**         | Cloudflare Workers                 |
| **HTTP API**        | Hono                               |
| **Real-time**       | WebSockets + Durable Objects       |
| **Database**        | Neon PostgreSQL + Drizzle ORM      |
| **Auth**            | Firebase token exchange            |

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

- **Academic Data** — GPA, marks, attendance, profiles, and leaderboard data flow directly to Firestore from the browser
- **Chat Data** — Chat uses the shared `@bhemu/chat` client and the deployed Cloudflare Worker/WebSocket service
- **Context-Based State** — React Context hooks for global state (Auth, GPA, Marks, Attendance)
- **Co-located Hooks** — Feature-specific hooks live alongside their components
- **Server Components** — Next.js App Router with RSC for SEO-critical pages
- **Real-time Listeners** — Firebase `onSnapshot` for live collaboration

### Mobile Architecture

- **Expo Router** — File-based authenticated and tab navigation
- **Context + Feature Modules** — Auth, GPA, chat, notifications, updates, UMS data, and sync remain isolated by feature
- **Cached Startup** — Local GPA/chat caches render useful data while remote services reconnect
- **UMS Fallback** — The WebView exposes the UMS page only when login or Cloudflare verification is needed; successful sync closes it and continues in the background

### Chat Architecture

- **Shared Contract** — `@bhemu/shared` contains chat types, limits, timestamp formatting, grouping, and message merge helpers
- **Shared Client** — `@bhemu/chat` provides the platform-neutral REST API client
- **Worker Backend** — Hono routes handle sessions, rooms, messages, reactions, polls, reports, attachments, moderation, and WebSocket events
- **Durable Room State** — Cloudflare Durable Objects coordinate room connections and ordered events

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
| `pnpm dev:mobile`   | Start Expo mobile development server           |
| `pnpm build`        | Build all workspaces (correct order via turbo) |
| `pnpm build:shared` | Build `@bhemu/shared` only                     |
| `pnpm build:web`    | Build frontend (shared builds first)           |
| `pnpm build:ext`    | Build extension (shared builds first)          |
| `pnpm typecheck`    | Type-check all workspaces                      |
| `pnpm lint`         | Lint all workspaces                            |
| `pnpm test`         | Run `@bhemu/shared` unit tests                 |

### Chat Worker (`cd apps/chat-worker`)

| Command            | Description                                 |
| ------------------ | ------------------------------------------- |
| `pnpm dev`         | Run the Worker locally with Wrangler        |
| `pnpm deploy`      | Deploy the Worker to Cloudflare             |
| `pnpm typecheck`   | Type-check the Worker                       |
| `pnpm test:all`    | Run unit, integration, and end-to-end tests |
| `pnpm db:generate` | Generate Drizzle migrations                 |
| `pnpm db:migrate`  | Apply database migrations                   |

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

# Optional local chat Worker override
NEXT_PUBLIC_CHAT_API_BASE=

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
