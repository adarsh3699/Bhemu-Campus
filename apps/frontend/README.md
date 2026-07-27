# 🎓 bCampus — Frontend

> Next.js 16 web application for academic GPA tracking, marks analysis, and smart planning tools.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8)](https://tailwindcss.com/)

## 📋 Overview

The frontend is a **pure client-side** Next.js application with no backend API. All data flows directly from the browser to Firebase Firestore, with real-time collaboration powered by Firebase `onSnapshot` listeners.

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

### 🏆 Leaderboard
- **CGPA Rankings** — Program & batch-wise comparisons
- **Shareable Rank Cards** — Beautiful OG images for social sharing

### 🔐 Authentication
- Email/password + Google OAuth
- Password reset & email verification
- Account deletion with full data cleanup

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Language** | TypeScript 5.0 |
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
│   └── modal/                  # Reusable modals
│
├── contexts/                   # React Context providers
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
│   └── drawLeaderboardCard.ts  # Canvas-based OG image generation
│
└── types/
    ├── index.ts                # Barrel export
    ├── gpa.ts
    ├── attendance.ts
    ├── marks.ts
    ├── auth.ts
    ├── share.ts
    └── leaderboard.ts
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
1. **No backend API** — all reads/writes go directly from browser to Firestore
2. **Real-time sync** — `onSnapshot` listeners in Context providers
3. **Optimistic updates** — Local state updated immediately before Firestore write
4. **Collaborative editing** — Shared profiles with `permission="edit"` write to owner's Firestore

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
