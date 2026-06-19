# Bhemu Calculator

A modern academic GPA tracking and planning tool built with Next.js. Calculate your SGPA & CGPA, plan future GPA goals, manage multiple academic profiles, and collaborate with classmates in real-time.

🔗 **Live:** [bhemu-calculator.vercel.app](https://calc-bhemu.vercel.app)

## Features

- **GPA Calculator** — Add semesters, subjects, grades, and credits. Instantly see your semester GPA and cumulative CGPA.
- **GPA Goal Planner** — Set a target CGPA and see what grades you need in upcoming semesters to achieve it.
- **Reappear Calculator** — Calculate the impact of reappear/backlog subjects on your overall GPA.
- **Dashboard** — Visual overview of your academic progress with semester-wise bar charts and a roadmap view.
- **Profile Management** — Create multiple academic workspace profiles, set a default, and quickly switch between them.
- **Real-time Collaboration** — Share profiles with classmates (read or edit access) and collaborate live via Firebase.
- **UMS Integration** — Import semester data directly from your university's UMS portal.
- **Authentication** — Email/password sign-up, login, password reset, and email verification via Firebase Auth.

## Tech Stack

| Category        | Technology                              |
| --------------- | --------------------------------------- |
| Framework       | Next.js 16 (App Router, Turbopack)      |
| Language        | TypeScript                              |
| UI              | React 19, Tailwind CSS v4, Lucide Icons |
| Charts          | Recharts                                |
| Backend         | Firebase (Firestore, Auth)              |
| Package Manager | pnpm                                    |

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm

### Setup

```bash
# Clone the repo
git clone https://github.com/adarsh3699/Bhemu-Calculator.git
cd Bhemu-Calculator

# Install dependencies
pnpm install

# Create environment file
cp .env.example .env
# Fill in your Firebase config values in .env

# Start dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Scripts

| Command      | Description                               |
| ------------ | ----------------------------------------- |
| `pnpm dev`   | Start dev server with Turbopack           |
| `pnpm build` | Create production build                   |
| `pnpm start` | Start production server                   |
| `pnpm lint`  | Run ESLint                                |
| `pnpm clean` | Remove `.next`, `node_modules`, reinstall |

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── dashboard/          # Dashboard with stats & charts
│   ├── gpa-calculator/     # Main GPA calculator
│   ├── gpa-goal-planner/   # Target CGPA planner
│   ├── reappear-calculator/ # Backlog/reappear calculator
│   ├── settings/           # User profile & account settings
│   ├── about/              # About page
│   ├── login/              # Auth pages
│   ├── register/
│   ├── forgot-password/
│   ├── reset-password/
│   └── verify-email/
├── components/
│   ├── layout/             # AppShell, SideBar, TopBar
│   ├── Dashboard/          # Dashboard stats, charts, roadmap
│   ├── GpaCalculator/      # Calculator view, subject form, hooks
│   ├── GpaGoalPlanner/     # Goal planner view
│   ├── ReappearCalculator/ # Reappear calculator view
│   ├── Settings/           # Profile settings, security, danger zone
│   ├── About/              # About page view
│   ├── ProfileDrawer.tsx   # Workspace profile switcher drawer
│   ├── common/             # Shared components (NavBar, Messages, etc.)
│   └── modal/              # Reusable modals (Confirm, Input, Share, UMS)
├── firebase/               # Firebase Auth context & GPA service
├── hooks/                  # GpaDataContext (global state provider)
├── types/                  # TypeScript type definitions
├── utils/                  # GPA calculation utilities, UMS service
└── lib/                    # SEO metadata & JSON-LD utilities
```

## Author

**Adarsh Suman**

- Portfolio: [adarshsuman.in](https://adarshsuman.in)
- GitHub: [@adarsh3699](https://github.com/adarsh3699)
- LinkedIn: [adarsh3699](https://linkedin.com/in/adarsh3699)

## License

This project is private.
