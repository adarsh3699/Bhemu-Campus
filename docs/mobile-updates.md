# bCampus mobile release guide

This project has two update systems. Use this rule every time:

| You changed...                                                                                  | Publish with...         | User installs a new APK? |
| ----------------------------------------------------------------------------------------------- | ----------------------- | ------------------------ |
| React/TypeScript code, screens, text, styles, or bundled images                                 | EAS Update (OTA)        | No                       |
| A native package, Expo SDK, permission, Firebase native file, `app.json`, or Android/iOS config | EAS Build (APK)         | Yes                      |
| A change that must be installed by everyone                                                     | APK + `mandatory: true` | Yes                      |

OTA cannot add native code. If you are unsure, ship an APK.

## Keep release metadata in one frontend source

The native app version and the public release metadata serve different runtimes. Change `expo.version` in `apps/mobile/app.json` for the APK build, then maintain the public release metadata only in `apps/frontend/src/lib/mobileRelease.ts`.

`mobileRelease.ts` is the single source for the frontend's:

1. `/mobile/update.json` endpoint used by older APKs.
2. Landing-page download links and displayed APK version.

- **OTA release:** Keep the same app version. Publish the JavaScript update with an EAS channel and message.
- **APK release:** Increase `expo.version`, build and test a new APK, upload it, then update `mobileRelease.ts` once.
- **Android build number:** EAS manages this internal value automatically. It is not part of your release checklist or manifest.

The OTA system compares the manifest's `version` with the installed app version. Therefore, every APK release must use a higher semantic version such as `1.0.1`, `1.1.0`, or `2.0.0`, and `MOBILE_RELEASE.version` must match the APK's `expo.version`.

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

The `public` profile auto-increments Android's internal build number on EAS. You change `expo.version` in `apps/mobile/app.json`, then update `apps/frontend/src/lib/mobileRelease.ts` after the APK is ready.

The release source is consumed by both the update endpoint and the landing page, so the version and APK URL cannot drift between those surfaces. Update it only after the new APK has been built, tested, and uploaded.

Change this field for a new APK release:

```jsonc
// apps/mobile/app.json
{
	"expo": {
		"version": "1.1.2",
	},
}
```

Do not use `apps/mobile/package.json` as the installed app version. It is the workspace package version. Do not manually edit `android.versionCode`; EAS owns that internal value.

### 2. Build the APK

```bash
cd apps/mobile
npx expo-doctor
pnpm typecheck
pnpm lint
eas build --profile public --platform android
```

Download the `.apk` artifact. Test it on a real Android device before publishing it.

Do not use `./gradlew assembleRelease` as the public release artifact unless the release signing key is explicitly configured. In this project, an unconfigured local Gradle release uses the Android debug certificate and cannot upgrade an EAS-signed installation. The in-app installer permission is native, so changes to it also require a new EAS APK.

### 3. Upload the APK

Create a **mobile-only** GitHub Release with this naming convention:

- Tag: `mobile-v1.1.2`
- Title: `[Mobile] bCampus v1.1.2`
- Asset: `bcampus-mobile-v1.1.2.apk`

You can publish it from the terminal after downloading the EAS artifact:

```bash
gh release create mobile-v1.1.2 /path/to/bcampus-mobile-v1.1.2.apk \
  --repo adarsh3699/Bhemu-Campus \
  --title "[Mobile] bCampus v1.1.2" \
  --notes "Mobile APK release for bCampus v1.1.2" \
  --latest=true
```

Copy the asset's public HTTPS download URL after upload. Do not use a private, expiring, or `latest.apk` URL. `--latest=false` keeps this mobile release from replacing the extension release shown as the repository's latest release. Existing extension releases such as `ext-v1.2.1` remain unchanged.

GitHub Releases are a free way to distribute APKs without a Play Store developer account. Users can download the APK from the release page, and the in-app updater can download the same public asset automatically.

### 4. Publish release metadata

After the APK is uploaded and tested, edit `apps/frontend/src/lib/mobileRelease.ts` with the version, APK URL, notes, and mandatory setting. Deploy the frontend after saving it. The same source powers:

- the update endpoint:

    ```text
    https://campus.bhemu.in/mobile/update.json
    ```

- all mobile download CTAs on the landing page.

Do not edit a generated/public JSON file or duplicate release constants in `page.tsx`.

Example source for a normal optional update:

```ts
// apps/frontend/src/lib/mobileRelease.ts
export const MOBILE_RELEASE = {
	version: "1.1.2",
	apkUrl: "https://github.com/adarsh3699/Bhemu-Campus/releases/download/mobile-v1.1.2/bcampus-mobile-v1.1.2.apk",
	websiteUrl: "https://campus.bhemu.in/",
	releaseNotes: ["Faster GPA calculations", "Improved attendance sync"],
	mandatory: false,
} as const;
```

The route at `apps/frontend/src/app/mobile/update.json/route.ts` exposes this object as the stable JSON endpoint.

The `version` must be higher than the installed app version and must exactly match the new APK's `expo.version`. The endpoint is checked at app startup, so changing release metadata does not require another app build.

### Manifest fields in plain language

- `version`: the new app version shown in the update dialog. It must be higher than the installed `expo.version`.
- `apkUrl`: the complete public HTTPS download link to the APK produced by EAS. For a GitHub Release, copy the asset's **Download** link, for example `https://github.com/OWNER/REPO/releases/download/v1.1.0/bcampus-1.1.0.apk`. This is the file the app downloads when the user taps **Update now**. It is not the GitHub repository URL or the release web page URL.
- `websiteUrl`: the HTTPS website URL shown as a backup option in the update dialog. Keep it on the bCampus website's APK download page.
- `releaseNotes`: short text shown in the update dialog.
- `mandatory`: controls whether the user may postpone the update. Use `false` for a normal optional update. Use `true` only for a security, compatibility, or critical fix; the dialog removes **Later** and asks the user to install. Android still requires the user to approve the package installer and unknown-source permission.

The update endpoint and landing page always read the same `MOBILE_RELEASE` object, so no manual alignment is required between them.

## Mandatory updates

Set `mandatory` to `true` only when users must install the APK before continuing:

```json
{
	"version": "2.0.0",
	"apkUrl": "https://example.com/bcampus-2.0.0.apk",
	"websiteUrl": "https://campus.bhemu.in/",
	"releaseNotes": ["Required security update"],
	"mandatory": true
}
```

For optional updates, users can choose **Later**. The app asks again after the defer period. A mandatory update does not offer **Later**.

## Version examples

| Release                                         | Change `expo.version`? | Build APK? |            Publish OTA? |
| ----------------------------------------------- | ---------------------: | ---------: | ----------------------: |
| Fix a typo in a screen                          |                     No |         No |                     Yes |
| Add a new React screen                          |                     No |         No |                     Yes |
| Large UI redesign with no native changes        |                     No |         No |                     Yes |
| Want the installed app to display a new version |                    Yes |        Yes | Optional follow-up only |
| Add `expo-camera`                               |                    Yes |        Yes | Optional follow-up only |
| Add an Android permission                       |                    Yes |        Yes | Optional follow-up only |
| Upgrade Expo SDK                                |                    Yes |        Yes | Optional follow-up only |
| Security fix requiring native code              |                    Yes |        Yes |       Usually mandatory |

## Rollback and safety

- OTA: publish a corrected update to the same channel. Keep the same runtime-compatible app binary.
- APK: publish a new higher `expo.version`; EAS handles Android's internal build number.
- Never point `apkUrl` at a local file, private GitHub asset, HTTP URL, or expiring URL.
- Keep the manifest endpoint stable. If the host changes, keep the old URL working with a redirect or proxy.
- Leave `MOBILE_RELEASE.apkUrl` empty when no APK release is available:

    ```ts
    export const MOBILE_RELEASE = {
    	version: "1.0.0",
    	apkUrl: "",
    	websiteUrl: "https://campus.bhemu.in/",
    	releaseNotes: [],
    	mandatory: false,
    } as const;
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
- [ ] Update `apps/frontend/src/lib/mobileRelease.ts` with the tested version, APK URL, notes, and mandatory flag.
- [ ] Deploy the frontend.
- [ ] Test the update dialog, download progress, installer, **Later**, and retry.

## Useful official references

- [EAS Update](https://docs.expo.dev/eas-update/getting-started/)
- [Runtime versions and update compatibility](https://docs.expo.dev/eas-update/runtime-versions/)
- [EAS app version management](https://docs.expo.dev/build-reference/app-versions/)
- [EAS build profiles](https://docs.expo.dev/eas/json/)
- [Android APK distribution](https://developer.android.com/distribute/marketing-tools/alternative-distribution)
