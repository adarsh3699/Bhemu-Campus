# 🎓 bCampus — Frontend

> Next.js 16 web application for academic tools, real-time campus chat, profiles, and mobile release distribution.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8)](https://tailwindcss.com/)

## 📋 Overview

The frontend is a Next.js application. Academic data flows directly from the browser to Firebase Firestore, while chat uses the shared `@bhemu/chat` client and the deployed Cloudflare Worker/WebSocket service. Firebase `onSnapshot` listeners power academic collaboration.

🔗 **Live:** [campus.bhemu.in](https://campus.bhemu.in)

---

## ✨ Features

### 🧮 Academic Tools
- **GPA Calculator** — Add semesters, subjects, grades, credits. Auto-compute SGPA & CGPA
- **Marks Analysis** — CA, Mid, End breakdowns with grade predictions & custom cutoffs
- **Attendance Tracker** — Smart calculator: "How many can I miss?" or "How many do I need?"
- **Goal Planner** — Set target CGPA → see required grades per semester
- **Reappear Calculator** — Simulate theory/hybrid/practical reappear scenarios

### 👥 Collaboration
- **Profile Sharing** — Share with read or edit access
- **Real-time Sync** — Live updates via Firebase listeners
- **Multiple Workspaces** — Separate profiles for different contexts

### 💬 Campus Chat (Beta)
- **University and Batchmate rooms** with live online presence
- **Real-time messages** over WebSockets with optimistic updates and reconnect handling
- **Replies, reactions, editing, deletion, reporting, date separators, and message grouping**
- Shared message types, timestamp formatting, and merge logic from `@bhemu/shared`

### 🏆 Leaderboard
- **CGPA Rankings** — Program & batch-wise comparisons
- **Shareable Rank Cards** — Beautiful OG images for social sharing

### 🔐 Authentication
- Email/password + Google OAuth
- Password reset & email verification
- Account deletion with full data cleanup

### 📱 Mobile Release Support
- Serves the mobile update manifest at `/mobile/update.json`
- Keeps release metadata, notes, website URL, and backup APK URL in one source: `src/lib/mobileRelease.ts`
- The mobile app uses this manifest for update checks and APK fallback downloads

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Language** | TypeScript 6 |
| **UI** | React 19, Tailwind CSS v4 |
| **Icons** | Lucide React |
| **Charts** | Recharts |
| **Backend** | Firebase 12 (Firestore, Auth) |
| **Package Manager** | pnpm |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- pnpm

### Installation

```bash
# Install dependencies
pnpm install

# Setup environment variables
cp .env.example .env
# Fill in your Firebase config

# Start dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 📜 Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server with Turbopack |
| `pnpm build` | Create production build |
| `pnpm start` | Serve production build |
| `pnpm lint` | Run ESLint |
| `pnpm clean` | Remove `.next` + `node_modules`, reinstall |

---

## 📂 Project Structure

```
src/
├── app/                        # Next.js App Router pages
│   ├── (auth)/                 # Auth route group
│   │   ├── login/
│   │   ├── register/
│   │   ├── forgot-password/
│   │   ├── reset-password/
│   │   └── verify-email/
│   ├── dashboard/
│   ├── gpa-calculator/
│   ├── attendance-calculator/
│   ├── gpa-goal-planner/
│   ├── reappear-calculator/
│   ├── leaderboard/
│   ├── chat/
│   ├── rank/[id]/              # Shareable rank cards
│   ├── settings/
│   ├── about/
│   └── api/og/                 # OG image generation
│
├── components/
│   ├── About/
│   │   ├── AboutView.tsx
│   │   └── icons.tsx
│   ├── AttendanceCalculator/
│   │   ├── hooks/              # Feature-scoped hooks
│   │   └── *.tsx               # View + subcomponents
│   ├── Dashboard/
│   ├── GpaCalculator/
│   │   └── hooks/              # useGpaCalculator, useMarksAnalysis
│   ├── GpaGoalPlanner/
│   ├── Leaderboard/
│   │   └── hooks/              # useLeaderboard
│   ├── Rank/                   # Rank card components
│   │   ├── lib/rankUtils.ts
│   │   ├── RankCardView.tsx
│   │   └── RankNotFound.tsx
│   ├── ReappearCalculator/
│   │   ├── types.ts
│   │   ├── MarkInput.tsx
│   │   └── ResultPanel.tsx
│   ├── Settings/
│   │   └── hooks/              # useProfileData
│   ├── common/                 # Shared presentational components
│   │   ├── PageHeader.tsx
│   │   ├── NavBar.tsx
│   │   ├── LoginRecommendation.tsx
│   │   ├── AuthShowcase.tsx
│   │   └── ProfileDrawer.tsx
│   ├── layout/                 # Layout components
│   │   ├── AppShell.tsx
│   │   ├── SideBar.tsx
│   │   ├── TopBar.tsx
│   │   └── GlobalHandlers.tsx
│   ├── modal/                  # Reusable modals
│   └── chat/                   # Chat rooms, messages, composer, edit/report UI
│
├── contexts/                   # React Context providers
│   ├── ChatContext.tsx         # Chat session, rooms, WebSocket, cache, actions
│   ├── GpaDataContext.tsx      # Profiles, semesters, sharing
│   ├── AttendanceDataContext.tsx
│   ├── MarksDataContext.tsx
│   └── MessageContext.tsx      # Toast notifications
│
├── firebase/
│   ├── config.ts               # Firebase app initialization
│   ├── AuthContext.tsx         # Auth provider + hooks
│   ├── gpaService.ts           # GPAService class (CRUD + listeners)
│   ├── attendanceService.ts
│   └── leaderboardService.ts
│
├── lib/                        # Pure utility functions
│   ├── gpaUtils.ts             # calculateGPA, calculateCGPA
│   ├── marksUtils.ts           # computeGradeFromMarks, grade tables
│   ├── grades.ts               # Grade definitions
│   ├── programUtils.ts
│   ├── seo.ts                  # Metadata & JSON-LD helpers
│   ├── fetchLeaderboardEntry.ts
│   ├── drawLeaderboardCard.ts  # Canvas-based OG image generation
│   └── mobileRelease.ts        # Single source for mobile update metadata
│
└── types/
    ├── index.ts                # Barrel export
    ├── gpa.ts
    ├── attendance.ts
    ├── marks.ts
    ├── auth.ts
    ├── share.ts
    └── leaderboard.ts

# Also exposed by the App Router:
# src/app/mobile/update.json/route.ts — static mobile update manifest route
```

---

## 🏗️ Architecture

### State Management
Managed via **React Context + hooks** — no Redux or Zustand.

**Provider hierarchy** (in `src/app/layout.tsx`):
```
AuthContext → MessageContext → GpaDataContext → AttendanceDataContext → MarksDataContext → AppShell
```

| Context | Responsibility |
|---------|---------------|
| `AuthContext` | Firebase user auth, Google OAuth, account deletion |
| `MessageContext` | Toast notifications via `useMessage()` |
| `GpaDataContext` | Profiles, semesters, sharing — real-time Firestore listeners |
| `AttendanceDataContext` | Attendance data for active profile |
| `MarksDataContext` | Derived marks view over semesters |

### Data Flow
1. **Academic data** — Reads/writes go directly from the browser to Firestore
2. **Chat data** — Chat sessions use Firebase authentication, then REST/WebSocket calls to the chat Worker
3. **Real-time sync** — Firestore `onSnapshot` listeners and chat WebSocket events update active views
4. **Optimistic updates** — Local state updates immediately before remote confirmation
5. **Collaborative editing** — Shared profiles with `permission="edit"` write to the owner's Firestore data

### Firebase Schema
See [../docs/firestore-schema.md](../docs/firestore-schema.md) for full Firestore structure.

### Routing Patterns
- **Auth routes** — Grouped in `(auth)/` with no `AppShell` layout
- **Protected routes** — Display `<LoginRecommendation />` if not authenticated
- **Shareable pages** — `/rank/[id]` generates OG images for social sharing

---

## 🧩 Component Patterns

### Feature Components
Each major feature has its own folder with:
- **View component** (e.g., `GpaCalculatorView.tsx`) — main composition
- **Subcomponents** — domain-specific UI pieces
- **`hooks/` subfolder** — feature-scoped custom hooks (single-use)
- **`lib/` subfolder** (optional) — feature-only pure functions

### Hooks Organization
- **`src/contexts/`** — Context providers used app-wide
- **`src/components/<Feature>/hooks/`** — Single-consumer hooks, co-located

### UI Primitives
- **`components/common/`** — Presentational, domain-agnostic components
- **`components/modal/`** — Reusable modals (Confirm, Input, Share, UMS)

---

## 🔐 Environment Variables

Create `.env` with:

```env
# Firebase Config (required)
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

---

## 🧪 Key Features Implementation

### GPA Calculation
Pure functions in `src/lib/gpaUtils.ts`:
- `calculateGPA(subjects)` — SGPA for one semester
- `calculateCGPA(semesters)` — Cumulative across all semesters

### Marks Analysis
- Grade tables: `src/lib/grades.ts`
- Custom cutoffs per subject
- Auto-compute grade points from raw marks

### Real-time Collaboration
- `onProfilesChange()` — Listen to profile updates
- `onSemestersChange()` — Listen to semester edits
- `onCollaborativeProfileChange()` — Listen to shared profiles you can edit

### Profile Sharing
- `shareProfileWithUser(profileId, email, permission)` — Share via email
- `copySharedProfile(sharedProfileId)` — Clone to own workspace
- Permissions: `"read"` (view-only) or `"edit"` (collaborative)

### Chat

- `src/contexts/ChatContext.tsx` owns chat authentication, room loading, message pagination, WebSocket reconnects, optimistic messages, and message actions.
- The production chat endpoint defaults to `https://bcampus-chat.bhemu.in`; set `NEXT_PUBLIC_CHAT_API_BASE` for local Worker development.
- Web chat supports University and Batchmate rooms, replies, reactions, editing, deletion, reporting, presence, and reconnect-safe updates.

### Mobile Release Manifest

- Edit `src/lib/mobileRelease.ts` for a release.
- `src/app/mobile/update.json/route.ts` exposes the same object as a cacheable JSON endpoint.
- Keep the APK URL HTTPS and update release notes with every published mobile build.

---

## 🎨 Styling

- **Tailwind CSS v4** with custom theme
- **Dark mode** as default (no toggle)
- **Lucide icons** for consistency
- **Recharts** for data visualization

Custom CSS utilities in `src/app/globals.css`.

---

## 📊 Analytics & SEO

### Metadata
- Dynamic per-page metadata via `generateMetadata()`
- JSON-LD structured data for rich results
- Custom OG images for shareable pages

### SEO Utilities
See `src/lib/seo.ts`:
- `generatePageMetadata()` — base metadata
- `generateWebsiteJsonLd()` — website schema
- `generateWebAppJsonLd()` — web application schema

---

## 🚀 Deployment

### Vercel (Recommended)
```bash
pnpm build
# Deploy to Vercel
```

### Environment Setup
1. Add all `NEXT_PUBLIC_*` env vars in Vercel dashboard
2. Ensure Firebase Auth domain includes your Vercel URL
3. Update Firebase `authDomain` if using custom domain

---

## 🐛 Troubleshooting

### Build Errors
```bash
# Clean build
pnpm clean

# Check TypeScript
pnpm tsc --noEmit
```

### Firebase Auth Issues
- Verify `.env` variables are correct
- Check Firebase Auth domain whitelist
- Ensure email verification is enabled in Firebase Console

### Real-time Sync Not Working
- Check Firestore security rules
- Verify user is authenticated
- Check browser console for errors

---

## 👤 Author

**Adarsh Suman**

- Portfolio: [adarshsuman.in](https://www.adarshsuman.in)
- LinkedIn: [adarsh3699](https://www.linkedin.com/in/adarsh3699/)
- GitHub: [@adarsh3699](https://github.com/adarsh3699)

---

## 📄 License

Private and proprietary. All rights reserved.
