# bCampus mobile release guide

This project has two update systems. Use this rule every time:

| You changed... | Publish with... | User installs a new APK? |
| --- | --- | --- |
| React/TypeScript code, screens, text, styles, or bundled images | EAS Update (OTA) | No |
| A native package, Expo SDK, permission, Firebase native file, `app.json`, or Android/iOS config | EAS Build (APK) | Yes |
| A change that must be installed by everyone | APK + `mandatory: true` | Yes |

OTA cannot add native code. If you are unsure, ship an APK.

## You maintain one version

For APK releases, update the same app version in two places: `apps/mobile/app.json` and `apps/frontend/public/mobile/update.json`.

- **OTA release:** Keep the same app version. Publish the JavaScript update with an EAS channel and message.
- **APK release:** Increase `expo.version`, build a new APK, and manually copy that version into the remote manifest.
- **Android build number:** EAS manages this internal value automatically. It is not part of your release checklist or manifest.

The OTA system compares the manifest's `version` with the installed app version. Therefore, every APK release must use a higher semantic version such as `1.0.1`, `1.1.0`, or `2.0.0`, and the two manually maintained values must match.

## Professional release policy

Use the same release discipline for every production change:

1. Work on a branch and merge reviewed code before publishing.
2. Run `pnpm typecheck` and `pnpm lint` from `apps/mobile`.
3. Test the update on a preview APK using the `preview` channel.
4. Publish production OTA updates only from the reviewed commit.
5. For native changes, increase `expo.version`, build the APK, install it on a real device, and only then publish its manifest entry.
6. Keep APKs in immutable, versioned GitHub Releases. Do not use a `latest.apk` URL that can silently change.
7. Keep the Android package name and signing credentials unchanged so future APKs are valid upgrades.

The app's `runtimeVersion` is tied to `expo.version`. Never publish an OTA update that imports a native API missing from the installed APK. If the native runtime changes, build the new APK first; Expo uses runtime versions to prevent incompatible updates from being delivered to old binaries.

## The simple release flow

### Everyday UI or logic change (OTA)

After the first production APK has been installed, an OTA release needs only EAS. Do **not** upload anything to GitHub, edit `update.json`, change `expo.version`, or build a new APK.

```bash
cd apps/mobile
pnpm typecheck
pnpm lint
eas update --channel production --message "Describe the change"
```

`pnpm typecheck` and `pnpm lint` are release-quality checks; the only publish command is `eas update`.

Users receive the update when the app checks for updates and restarts. The installed APK must have been built for the same `production` channel and compatible runtime. This channel/APK setup is required only once; future JavaScript and UI releases use the command above.

### Native or major change (new APK)

```bash
cd apps/mobile
# Change expo.version in app.json, for example 1.0.0 -> 1.1.0
eas build --profile public --platform android
```

Download the APK from the EAS build page, upload it to a GitHub Release, then update the remote manifest (see below). Keep the same Android package and signing credentials so Android upgrades the existing installation.

“Major” can mean two different things:

- A **major product release** that only changes React/TypeScript can still be shipped as OTA. It does not change the installed app version.
- A **major app/native release** changes `expo.version` (for example `1.4.0` to `2.0.0`) and therefore needs a new APK.

## One-time setup

This repository is already configured. If setting up a new machine, run:

```bash
cd apps/mobile
pnpm install
npx expo install expo-updates expo-application expo-file-system expo-intent-launcher
eas update:configure
```

Log in once before the first build or OTA publish:

```bash
eas login
eas whoami
```

Do not replace the existing `updates.url`, `runtimeVersion`, or EAS project ID in `app.json`. They connect installed builds to the OTA project.

Build the first installable APK before publishing OTA updates:

```bash
eas build --profile public --platform android
```

The `public` profile creates an installable APK on the `production` channel. Install this APK on a device, then use `eas update --channel production ...` for OTA releases.

For testing, use the preview channel:

```bash
eas build --profile preview --platform android
eas update --channel preview --message "Test change"
```

Preview updates only reach preview APKs. Production updates only reach production APKs.

## OTA updates: exact procedure

Use this for JavaScript-only work.

1. Make the code change in `apps/mobile`.
2. Confirm it does not require a new native dependency, permission, or config plugin.
3. Run checks:

   ```bash
   pnpm typecheck
   pnpm lint
   ```

4. Publish to the channel used by the installed APK:

   ```bash
   eas update --channel production --message "Fix attendance totals"
   ```

5. Open the app, wait for the update check, force-close it, and reopen it.

Nothing else is required for OTA: no GitHub Release, no APK upload, no `update.json` edit, and no app-version change.

Do not change `expo.version` for a normal OTA release. Changing the app version changes the runtime when `runtimeVersion.policy` is `appVersion`, which requires a new APK.

## Major/native updates: exact procedure

Use this for native changes or a planned public release.

### 1. Choose the new versions

- `expo.version` is the user-visible version. Use semantic versions such as `1.0.0`, `1.1.0`, or `2.0.0`.
- A patch release (`1.0.1`) is a small fix; a minor release (`1.1.0`) adds compatible features; a major release (`2.0.0`) can contain breaking changes.

This project uses EAS remote versioning:

```jsonc
// apps/mobile/eas.json
"cli": { "appVersionSource": "remote" }
```

The `public` profile auto-increments Android's internal build number on EAS. You change `expo.version` in `apps/mobile/app.json`, then copy the same value into `update.json` after the APK is ready.

For an APK release, the version appears in two places for two different reasons:

1. `apps/mobile/app.json` embeds the version inside the new APK.
2. `apps/frontend/public/mobile/update.json` tells older APKs which version is available.

Keep both values exactly the same. Update the manifest only after the new APK has been built, tested, and uploaded.

Change this field for a new APK release:

```jsonc
// apps/mobile/app.json
{
  "expo": {
    "version": "1.1.0"
  }
}
```

Do not use `apps/mobile/package.json` as the installed app version. It is the workspace package version. Do not manually edit `android.versionCode`; EAS owns that internal value.

### 2. Build the APK

```bash
cd apps/mobile
pnpm typecheck
pnpm lint
eas build --profile public --platform android
```

Download the `.apk` artifact. Test it on a real Android device before publishing it.

### 3. Upload the APK

Create a **mobile-only** GitHub Release with this naming convention:

- Tag: `mobile-v1.1.0`
- Title: `[Mobile] bCampus v1.1.0`
- Asset: `bcampus-mobile-v1.1.0.apk`

You can publish it from the terminal after downloading the EAS artifact:

```bash
gh release create mobile-v1.1.0 /path/to/bcampus-mobile-v1.1.0.apk \
  --repo adarsh3699/Bhemu-Campus \
  --title "[Mobile] bCampus v1.1.0" \
  --notes "Mobile APK release for bCampus v1.1.0" \
  --latest=false
```

Copy the asset's public HTTPS download URL after upload. Do not use a private, expiring, or `latest.apk` URL. `--latest=false` keeps this mobile release from replacing the extension release shown as the repository's latest release. Existing extension releases such as `ext-v1.2.1` remain unchanged.

GitHub Releases are a free way to distribute APKs without a Play Store developer account. Users can download the APK from the release page, and the in-app updater can download the same public asset automatically.

### 4. Publish the manifest

After the APK is uploaded and tested, edit `apps/frontend/public/mobile/update.json` with the same version, APK URL, notes, and mandatory setting. Deploy the frontend after saving it. The endpoint is:

```text
https://campus.bhemu.in/mobile/update.json
```

Example for a normal optional update:

```json
{
  "version": "1.1.0",
  "apkUrl": "https://github.com/adarsh3699/Bhemu-Campus/releases/download/mobile-v1.1.0/bcampus-mobile-v1.1.0.apk",
  "releaseNotes": [
    "Faster GPA calculations",
    "Improved attendance sync"
  ],
  "mandatory": false
}
```

The `version` must be higher than the installed app version and must exactly match the new APK's `expo.version`. The manifest is checked at app startup, so changing this file does not require another app build.

### 5. Update the landing page

The landing page has three mobile download CTAs. After every APK release, update the versioned fallback in `apps/frontend/src/app/page.tsx` so new visitors get the same tested asset:

```ts
const MOBILE_APP_VERSION = "1.1.0";
const MOBILE_APP_URL =
  process.env.NEXT_PUBLIC_MOBILE_APP_URL ??
  "https://github.com/adarsh3699/Bhemu-Campus/releases/download/mobile-v1.1.0/bcampus-mobile-v1.1.0.apk";
```

If `NEXT_PUBLIC_MOBILE_APP_URL` is configured in the hosting environment, update it to the same URL or remove it so it does not override the versioned fallback. Deploy the frontend after updating both the manifest and landing page.

### Manifest fields in plain language

- `version`: the new app version shown in the update dialog. It must be higher than the installed `expo.version`.
- `apkUrl`: the complete public HTTPS download link to the APK produced by EAS. For a GitHub Release, copy the asset's **Download** link, for example `https://github.com/OWNER/REPO/releases/download/v1.1.0/bcampus-1.1.0.apk`. This is the file the app downloads when the user taps **Update now**. It is not the GitHub repository URL or the release web page URL.
- `releaseNotes`: short text shown in the update dialog.
- `mandatory`: controls whether the user may postpone the update. Use `false` for a normal optional update. Use `true` only for a security, compatibility, or critical fix; the dialog removes **Later** and asks the user to install. Android still requires the user to approve the package installer and unknown-source permission.

The current file at `apps/frontend/public/mobile/update.json` advertises the latest published APK. Keep its URL and version aligned with the landing page and GitHub Release.

## Mandatory updates

Set `mandatory` to `true` only when users must install the APK before continuing:

```json
{
  "version": "2.0.0",
  "apkUrl": "https://example.com/bcampus-2.0.0.apk",
  "releaseNotes": ["Required security update"],
  "mandatory": true
}
```

For optional updates, users can choose **Later**. The app asks again after the defer period. A mandatory update does not offer **Later**.

## Version examples

| Release | Change `expo.version`? | Build APK? | Publish OTA? |
| --- | ---: | ---: | ---: |
| Fix a typo in a screen | No | No | Yes |
| Add a new React screen | No | No | Yes |
| Large UI redesign with no native changes | No | No | Yes |
| Want the installed app to display a new version | Yes | Yes | Optional follow-up only |
| Add `expo-camera` | Yes | Yes | Optional follow-up only |
| Add an Android permission | Yes | Yes | Optional follow-up only |
| Upgrade Expo SDK | Yes | Yes | Optional follow-up only |
| Security fix requiring native code | Yes | Yes | Usually mandatory |

## Rollback and safety

- OTA: publish a corrected update to the same channel. Keep the same runtime-compatible app binary.
- APK: publish a new higher `expo.version`; EAS handles Android's internal build number.
- Never point `apkUrl` at a local file, private GitHub asset, HTTP URL, or expiring URL.
- Keep the manifest endpoint stable. If the host changes, keep the old URL working with a redirect or proxy.
- Leave the manifest at its initial state when no APK release is available:

  ```json
  {
    "version": "1.0.0",
    "apkUrl": "",
    "releaseNotes": [],
    "mandatory": false
  }
  ```

## Release checklist

### OTA checklist

- [ ] Change is JavaScript/UI/assets only.
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm lint` passes.
- [ ] Publish to the correct channel.
- [ ] Reopen a matching APK and verify the update.

### APK checklist

- [ ] Increase `expo.version` in `apps/mobile/app.json`.
- [ ] Build with `eas build --profile public --platform android`.
- [ ] Test the APK on Android.
- [ ] Upload the APK to a public GitHub Release.
- [ ] Update `apps/frontend/public/mobile/update.json` with the same version and APK URL.
- [ ] Update the landing-page mobile URL and displayed APK version.
- [ ] Deploy the frontend.
- [ ] Test the update dialog, download progress, installer, **Later**, and retry.

## Useful official references

- [EAS Update](https://docs.expo.dev/eas-update/getting-started/)
- [Runtime versions and update compatibility](https://docs.expo.dev/eas-update/runtime-versions/)
- [EAS app version management](https://docs.expo.dev/build-reference/app-versions/)
- [EAS build profiles](https://docs.expo.dev/eas/json/)
- [Android APK distribution](https://developer.android.com/distribute/marketing-tools/alternative-distribution)
