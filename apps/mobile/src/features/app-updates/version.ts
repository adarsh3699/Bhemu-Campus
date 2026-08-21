import type { AppUpdateManifest } from "./types";

function parseVersion(version: string): [number, number, number] | null {
	const match = version.trim().match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
	if (!match) return null;
	return [Number(match[1]), Number(match[2] ?? 0), Number(match[3] ?? 0)];
}

export function compareVersions(left: string, right: string): number {
	const leftParts = parseVersion(left);
	const rightParts = parseVersion(right);
	if (!leftParts || !rightParts) return left.localeCompare(right, undefined, { numeric: true });

	for (let index = 0; index < leftParts.length; index += 1) {
		if (leftParts[index] !== rightParts[index]) return leftParts[index] > rightParts[index] ? 1 : -1;
	}

	return 0;
}

export function isNewerVersion(
	currentVersion: string,
	manifest: Pick<AppUpdateManifest, "version">
): boolean {
	return compareVersions(manifest.version, currentVersion) > 0;
}

export function parseAppUpdateManifest(value: unknown): AppUpdateManifest {
	if (!value || typeof value !== "object") throw new Error("Update manifest is not an object.");

	const candidate = value as Record<string, unknown>;
	const version = typeof candidate.version === "string" ? candidate.version.trim() : "";
	const apkUrl = typeof candidate.apkUrl === "string" ? candidate.apkUrl.trim() : "";
	const websiteUrl = typeof candidate.websiteUrl === "string" ? candidate.websiteUrl.trim() : "";
	const releaseNotes = Array.isArray(candidate.releaseNotes)
		? candidate.releaseNotes.filter((note): note is string => typeof note === "string").slice(0, 8)
		: [];

	if (!version) throw new Error("Update manifest has an invalid version.");
	if (apkUrl && !/^https:\/\//i.test(apkUrl)) {
		throw new Error("Update manifest APK URL must use HTTPS.");
	}
	if (websiteUrl && !/^https:\/\//i.test(websiteUrl)) {
		throw new Error("Update manifest website URL must use HTTPS.");
	}

	return {
		version,
		apkUrl,
		websiteUrl,
		releaseNotes,
		mandatory: candidate.mandatory === true,
	};
}
