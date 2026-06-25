# UMS Data Sync — Chrome Extension

Sync your LPU UMS grades, marks, and attendance to Bhemu Calculator with one click.

## Install (Developer Mode)

1. Download `chrome-mv3-prod.zip` from [Releases](https://github.com/adarsh3699/Bhemu-Calculator/releases)
2. Unzip it
3. Open Chrome → go to `chrome://extensions/`
4. Enable **Developer mode** (top right toggle)
5. Click **"Load unpacked"** → select the unzipped folder
6. Done! Click the extension icon in toolbar to use it.

## Features

- One-click sync of all semester grades and marks
- Attendance sync
- Secure — data saved to your own Google account
- No manual data entry needed

## Requirements

- Google Chrome browser
- Active UMS session (logged into ums.lpu.in)
- Bhemu Calculator account

## Building from source

```bash
cd ums-extension
pnpm install
pnpm build && pnpm package
```

Output: `build/chrome-mv3-prod.zip`
