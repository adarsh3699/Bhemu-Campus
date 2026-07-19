# 🔄 UMS Data Sync — Chrome Extension

> One-click sync of LPU UMS grades, marks, and attendance to Bhemu Calculator

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue)](https://chromewebstore.google.com/detail/bfmmcngnpcmnopnjacnebpnfcohhigkp)
[![Plasmo](https://img.shields.io/badge/Plasmo-0.90.5-blue)](https://www.plasmo.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)

---

## 📋 Overview

Chrome MV3 extension that auto-imports your academic data from LPU UMS portal directly into Bhemu Calculator. No manual data entry needed — just click "Sync Everything" and you're done.

🔗 **Install:** [Chrome Web Store](https://chromewebstore.google.com/detail/bfmmcngnpcmnopnjacnebpnfcohhigkp)

---

## ✨ Features

- ⚡ **One-Click Sync** — Fetches all semester grades, marks & attendance from UMS
- 🔄 **Always Fresh** — Re-sync anytime to get latest results
- 🔒 **Secure** — Data saved directly to your Firebase account (same as web app)
- 🎯 **Lightweight** — Minimal permissions, runs only when you click
- 🚀 **Fast** — Parallel processing of all semesters

---

## 🚀 Installation

### From Chrome Web Store (Recommended)

1. Visit [Chrome Web Store](https://chromewebstore.google.com/detail/bfmmcngnpcmnopnjacnebpnfcohhigkp)
2. Click **"Add to Chrome"**
3. Pin the extension to toolbar for easy access
4. Done!

### Developer Mode (For Testing)

1. Download `chrome-mv3-prod.zip` from [Releases](https://github.com/adarsh3699/Bhemu-Calculator/releases)
2. Unzip the file
3. Open Chrome → `chrome://extensions/`
4. Enable **Developer mode** (top right toggle)
5. Click **"Load unpacked"** → select the unzipped folder
6. Extension is now installed!

---

## 🎯 How to Use

### First Time Setup

1. **Install Extension** (see above)
2. **Sign in to Bhemu Calculator** at [calc.bhemu.in](https://calc.bhemu.in)
3. **Click Extension Icon** in Chrome toolbar
4. **Authorize** — Grant permission to sync data with your account
5. **Click "Sync Everything"** — Wait for completion
6. **Check Web App** — Your UMS data is now synced!

### Regular Usage

1. Log in to [ums.lpu.in](https://ums.lpu.in)
2. Click the **UMS Sync extension** icon
3. Click **"Sync Everything"**
4. Wait for success message
5. Refresh Bhemu Calculator to see updated data

### What Gets Synced?

- ✅ All semester-wise grades (SGPA & CGPA)
- ✅ Subject-wise marks (CA, MTE, ETE)
- ✅ Attendance percentages per subject
- ✅ Program info (branch, batch, roll number)

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | Plasmo 0.90.5 (Chrome MV3) |
| **Language** | TypeScript |
| **UI** | React |
| **Backend** | Firebase 10 (Firestore, Auth) |
| **Parser** | linkedom (DOM manipulation) |
| **Package Manager** | pnpm |

---

## 🏗️ Architecture

### Components

```
src/
├── background/
│   └── index.ts              # Service worker (orchestrates sync)
├── contents/
│   └── authBridge.ts         # Content script (bridges auth token)
├── popup/
│   └── index.tsx             # Extension popup UI
├── components/
│   ├── PopupView.tsx         # Main popup view
│   └── SyncStatus.tsx        # Sync progress indicator
├── firebase/
│   └── config.ts             # Firebase initialization
└── utils/
    ├── umsParser.ts          # Parses UMS HTML
    └── firestoreSync.ts      # Writes to Firestore
```

### Flow

1. **User clicks "Sync"** → Popup sends message to background script
2. **Background script** fetches UMS pages (grades, marks, attendance)
3. **Parser** extracts data from HTML using linkedom
4. **Auth bridge** retrieves Firebase token from web app's `localStorage`
5. **Firestore sync** writes parsed data to user's Firestore collection
6. **Web app** receives real-time updates via `onSnapshot` listeners

---

## 🔧 Development

### Prerequisites

- Node.js 18+
- pnpm
- Chrome browser

### Setup

```bash
# Install dependencies
pnpm install

# Create environment file
cp .env.example .env
# Fill in Firebase config (same as frontend)

# Start development server (watch mode)
pnpm dev
```

### Load in Chrome

1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Click **"Load unpacked"**
4. Select `build/chrome-mv3-dev` folder
5. Extension is loaded with hot reload enabled

### Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev build with watch mode |
| `pnpm build` | Production build |
| `pnpm package` | Build + create zip for Chrome Web Store |
| `pnpm lint` | Run ESLint |
| `pnpm lint:fix` | ESLint with auto-fix |

---

## 📦 Build for Production

```bash
# Build and package
pnpm build
pnpm package

# Output: build/chrome-mv3-prod.zip
```

Upload `chrome-mv3-prod.zip` to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).

---

## 🔐 Permissions

The extension requests these permissions:

| Permission | Why Needed |
|-----------|-----------|
| `storage` | Store auth token locally |
| `tabs` | Detect UMS pages |
| `scripting` | Inject auth bridge script |
| `host_permissions` | Access UMS pages and Firebase |

**Privacy:** We don't collect, store, or share any personal data. All synced data goes directly to your own Firebase account.

---

## 🐛 Troubleshooting

### Extension Not Working

1. **Ensure you're logged in** to both UMS and Bhemu Calculator
2. **Check Chrome version** (must be 88+)
3. **Try reload extension** in `chrome://extensions/`
4. **Check console** for errors (click "background" link on extension card)

### Sync Failed

- **"Not authenticated"** → Sign in to Bhemu Calculator first, then retry
- **"UMS session expired"** → Log out and log back into UMS
- **"Network error"** → Check internet connection
- **"Firestore permission denied"** → Contact support (may be Firebase rules issue)

### Data Not Appearing

1. **Refresh Bhemu Calculator** after sync completes
2. **Check active profile** — data syncs to your currently active profile
3. **Verify UMS data** — ensure marks are actually visible in UMS first

---

## 🔒 Security

- **No backend server** — Extension writes directly to your Firestore
- **Auth token** never leaves your device (only stored in Chrome's `localStorage`)
- **HTTPS only** — All communication is encrypted
- **Minimal permissions** — Only requests what's absolutely necessary

---

## 🤝 Contributing

This is a private project. Contributions are not currently accepted.

---

## 👤 Author

**Adarsh Suman**

- Portfolio: [adarshsuman.in](https://www.adarshsuman.in)
- LinkedIn: [adarsh3699](https://www.linkedin.com/in/adarsh3699/)
- GitHub: [@adarsh3699](https://github.com/adarsh3699)

---

## 📄 License

Private and proprietary. All rights reserved.

---

## 📝 Changelog

### v1.1.0 (Latest)
- Added attendance sync
- Improved error handling
- UI polish

### v1.0.0
- Initial release
- Basic grade and marks sync
