# bCampus — Mobile App

React Native app built with Expo SDK 57 for Android and iOS. It provides the core academic tools plus native UMS sync, campus chat, notifications, cached startup data, and mobile update delivery.

## Tech Stack

| | |
|---|---|
| Framework | Expo SDK 57, React Native 0.86 |
| Routing | Expo Router (file-based, mirrors Next.js App Router) |
| Language | TypeScript |
| Auth | Firebase JS SDK v12 |
| State | React Context + hooks |
| Shared logic | `@bhemu/shared`, `@bhemu/chat`, `@bhemu/firebase` |
| UMS sync | `react-native-webview` with native cookie/session support |
| Notifications | Expo Notifications |
| Updates | Expo Updates + HTTPS APK fallback on Android |

## Commands

```bash
# From repo root
pnpm dev:mobile          # Start Metro bundler

# From apps/mobile/
npx expo run:android     # Build + install dev APK on connected Android
npx expo run:ios         # Build + install dev app on iOS Simulator
eas build --platform android  # Cloud build via EAS
eas build --platform ios      # Cloud iOS build via EAS

pnpm typecheck                # Type-check the mobile app
pnpm lint                     # Lint mobile source
```

## Folder Structure

```
src/
├── app/                  ← Expo Router file-based routes (routes ONLY — no components here)
│   ├── (auth)/           ← Unauthenticated screens (sign-in, sign-up, etc.)
│   └── (app)/(tabs)/     ← Authenticated tab screens
├── components/           ← UI components
│   ├── Chat/              ← Rooms, messages, composer, replies, reactions, moderation UI
│   ├── AttendanceCalculator/
│   ├── GpaCalculator/
│   ├── Home/
│   ├── Settings/
│   └── ui/               ← Atomic primitives (no domain logic)
├── constants/
│   ├── Colors.ts         ← All color tokens ← START HERE for design
│   └── Theme.ts          ← Spacing, radius, typography, shadows
├── contexts/             ← React Context providers
├── features/             ← Feature services and cache boundaries
│   ├── app-updates/      ← Manifest checks, APK download/install fallback
│   ├── chat/             ← Account-scoped AsyncStorage message cache
│   ├── notifications/    ← Timetable/exam reminders and settings
│   ├── sync/             ← UMS WebView and Firestore sync coordinator
│   └── ums-data/         ← UMS local data parsing/storage
├── firebase/             ← Firebase config + factory wrappers
├── hooks/
│   └── useTheme.ts       ← Access full design system in components
├── styles/               ← Shared StyleSheet definitions
│   ├── index.ts          ← Barrel export (import from @/styles)
│   ├── global.ts         ← App-wide patterns: Layout, Inputs, Buttons
│   └── auth.styles.ts    ← Auth feature group shared styles
└── types/                ← TypeScript types (re-exports from @bhemu/shared)
```

## Features

- **Academic tools** — GPA/CGPA, marks analysis, attendance calculator, goal planner, and reappear calculator.
- **UMS data** — Home dashboard, announcements, messages, timetable, and seating-plan screens consume synced UMS data.
- **Native UMS sync** — The WebView syncs authenticated UMS data in the background. If UMS shows a Cloudflare challenge, the WebView becomes visible so the user can complete verification; after verification or login, sync resumes automatically. If the user is already logged in, the WebView closes and sync continues in the background.
- **Campus Chat (Beta)** — University and Batchmate rooms with live messaging, presence, replies, reactions, edit/delete/report actions, WebSocket reconnects, and optimistic updates.
- **Fast startup** — GPA data and the latest 100 chat messages per room are cached locally and merged with fresh server data.
- **Notifications** — Optional timetable and exam reminders with settings and a test notification action.
- **Mobile updates** — The app checks `https://campus.bhemu.in/mobile/update.json`; Android can download the published APK from the update dialog as a backup path.

---

## Design System

### The Rule

> **Never use raw hex strings in any component or StyleSheet. Always reference a token.**

```ts
// ❌ Wrong
backgroundColor: "#0E0E0E"
color: "#0398AC"

// ✅ Correct
import { Colors } from "@/constants/Colors";
backgroundColor: Colors.background
color: Colors.primary
```

### Token Files

All design tokens are defined in `src/constants/` — the mobile equivalent of the web's `globals.css @theme {}` block.

| File | Contains |
|---|---|
| `Colors.ts` | Every color in the app — brand, backgrounds, text, borders, semantic |
| `Theme.ts` | Spacing scale, border radii, font sizes, font weights, shadow definitions |

### How to Use

**In `StyleSheet.create` (module level):**

```ts
import { Colors } from "@/constants/Colors";
import { Spacing, Radius } from "@/constants/Theme";

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
    padding: Spacing.lg,
    borderRadius: Radius.md,
  },
  button: {
    backgroundColor: Colors.primary,
    ...Shadow.glow,  // spread shadow tokens directly
  },
});
```

**Inside a component function (with `useTheme`):**

```ts
import { useTheme } from "@/hooks/useTheme";

function MyComponent() {
  const { colors, spacing, radius } = useTheme();
  // Use when you need tokens conditionally or in inline styles
}
```

### Adding a New Token

1. Add it to `src/constants/Colors.ts` (color) or `src/constants/Theme.ts` (spacing/radius/etc.)
2. Reference it by name — TypeScript will catch any typo at compile time

### Light Mode (Future)

When a light theme is designed:
1. Add `Colors.light.*` variants to `Colors.ts`
2. Update **only** `src/hooks/useTheme.ts` to call `useColorScheme()` and return the right variant
3. All components using `useTheme()` automatically update — no component changes needed

### Token Reference

See `src/constants/Colors.ts` for the full token list with comments. Key tokens:

| Token | Value | Usage |
|---|---|---|
| `Colors.primary` | `#0398AC` | Buttons, links, focus rings |
| `Colors.secondary` | `#00C2FF` | Links, secondary highlights |
| `Colors.accent` | `#004EEB` | CTAs, gradients |
| `Colors.background` | `#0E0E0E` | Screen backgrounds |
| `Colors.surface` | `#121212` | Cards, panels |
| `Colors.surfaceElevated` | `#1A1A1A` | Inputs, modals |
| `Colors.textPrimary` | `#FFFFFF` | Headings, body text |
| `Colors.textMuted` | `#A3A3A3` | Secondary text |
| `Colors.textSubtle` | `#737373` | Placeholders |
| `Colors.border` | `#262626` | Default borders |
| `Colors.borderLight` | `rgba(255,255,255,0.1)` | Subtle borders |

---

## Shared Styles

Reusable `StyleSheet` definitions live in `src/styles/`. This avoids duplicating the same styles across multiple screens.

### Two Layers

| File | Scope | Exports |
|---|---|---|
| `global.ts` | App-wide (any screen) | `Layout`, `Inputs`, `Buttons` |
| `<feature>.styles.ts` | Feature group (e.g. auth) | `AuthStyles` |

### How to Use

```ts
import { Layout, Inputs, Buttons } from "@/styles";
import { AuthStyles } from "@/styles/auth.styles";

// Use directly:
<View style={Layout.flex}>
<TextInput style={Inputs.field} />
<TouchableOpacity style={Buttons.primary}>

// Override with array syntax:
<TouchableOpacity style={[Buttons.primary, loading && Buttons.disabled]}>
<TouchableOpacity style={[Buttons.primary, local.extraMargin]}>
```

### Rules

1. **Never duplicate** — if 2+ screens share the same style, extract it to a shared file
2. **Array syntax for overrides** — `[Shared.style, local.override]`, never spread at runtime
3. **Use tokens** — all values in shared files must reference `Colors`, `Spacing`, `Radius`, `FontSize`, `FontWeight`, or `Shadow`
4. **Screen-local styles** — name the variable `local` (not `styles`) to distinguish from shared imports
5. **When to create a new feature file** — when a route group (e.g. `(settings)/`) has 2+ screens sharing 3+ identical styles, create `<feature>.styles.ts`
