import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "@bhemu/shared";
import type { GPAProfile, GPASemester } from "@bhemu/shared";

const CACHE_VERSION = 1;
const pendingWrites = new Map<string, Promise<void>>();
let gpaCacheWritesDisabled = false;

export function disableGpaCacheWrites(): void {
	gpaCacheWritesDisabled = true;
}

export function enableGpaCacheWrites(): void {
	gpaCacheWritesDisabled = false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeCachedProfile(value: unknown): GPAProfile | null {
	if (!isRecord(value) || (typeof value.id !== "string" && typeof value.id !== "number")) return null;
	return { ...value, id: String(value.id) } as GPAProfile;
}

function normalizeSemestersByProfile(value: unknown): Record<string, GPASemester[]> {
	if (!isRecord(value)) return {};
	return Object.fromEntries(
		Object.entries(value).filter(([, semesters]) => Array.isArray(semesters)) as Array<[string, GPASemester[]]>
	);
}

function normalizeShareIds(value: unknown): Record<string, string> {
	if (!isRecord(value)) return {};
	return Object.fromEntries(
		Object.entries(value).filter(([, shareId]) => typeof shareId === "string") as Array<[string, string]>
	);
}

export interface GpaCacheSnapshot {
	version: typeof CACHE_VERSION;
	activeProfile: string | null;
	profiles: GPAProfile[];
	sharedWithMeProfiles: GPAProfile[];
	mySharedProfiles: unknown[];
	sharedWithMeShareIds: Record<string, string>;
	semestersByProfile: Record<string, GPASemester[]>;
}

const cacheKey = (uid: string) => `${STORAGE_KEYS.gpaCache}:${uid}`;

function toSerializable(value: unknown): unknown {
	if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
		return value;
	}
	if (value instanceof Date) return value.getTime();
	if (typeof value === "object" && value && "toMillis" in value && typeof value.toMillis === "function") {
		return value.toMillis();
	}
	if (Array.isArray(value)) return value.map(toSerializable);
	if (typeof value === "object" && value) {
		const result: Record<string, unknown> = {};
		Object.entries(value).forEach(([key, entry]) => {
			const serialized = toSerializable(entry);
			if (serialized !== undefined) result[key] = serialized;
		});
		return result;
	}
	return undefined;
}

function normalizeProfile(profile: GPAProfile): GPAProfile {
	return toSerializable({ ...profile, id: String(profile.id) }) as GPAProfile;
}

function normalizeSemester(semester: GPASemester): GPASemester {
	return toSerializable(semester) as GPASemester;
}

export function createGpaCacheSnapshot(input: Omit<GpaCacheSnapshot, "version">): GpaCacheSnapshot {
	return {
		version: CACHE_VERSION,
		activeProfile: input.activeProfile == null ? null : String(input.activeProfile),
		profiles: input.profiles.map(normalizeProfile),
		sharedWithMeProfiles: input.sharedWithMeProfiles.map(normalizeProfile),
		mySharedProfiles: toSerializable(input.mySharedProfiles) as unknown[],
		sharedWithMeShareIds: { ...input.sharedWithMeShareIds },
		semestersByProfile: Object.fromEntries(
			Object.entries(input.semestersByProfile).map(([id, semesters]) => [id, semesters.map(normalizeSemester)])
		),
	};
}

export async function readGpaCache(uid: string): Promise<GpaCacheSnapshot | null> {
	try {
		const raw = await AsyncStorage.getItem(cacheKey(uid));
		if (!raw) return null;
		const parsed = JSON.parse(raw) as Partial<GpaCacheSnapshot>;
		if (parsed.version !== CACHE_VERSION || !Array.isArray(parsed.profiles)) return null;
		const profiles = parsed.profiles.map(normalizeCachedProfile).filter((profile): profile is GPAProfile => profile !== null);
		const sharedWithMeProfiles = Array.isArray(parsed.sharedWithMeProfiles)
			? parsed.sharedWithMeProfiles.map(normalizeCachedProfile).filter((profile): profile is GPAProfile => profile !== null)
			: [];
		return {
			version: CACHE_VERSION,
			activeProfile: parsed.activeProfile == null ? null : String(parsed.activeProfile),
			profiles,
			sharedWithMeProfiles,
			mySharedProfiles: Array.isArray(parsed.mySharedProfiles) ? parsed.mySharedProfiles : [],
			sharedWithMeShareIds: normalizeShareIds(parsed.sharedWithMeShareIds),
			semestersByProfile: normalizeSemestersByProfile(parsed.semestersByProfile),
		};
	} catch {
		return null;
	}
}

export async function writeGpaCache(uid: string, snapshot: Omit<GpaCacheSnapshot, "version">): Promise<void> {
	const previousWrite = pendingWrites.get(uid) ?? Promise.resolve();
	const write = previousWrite.catch(() => {}).then(async () => {
		try {
			// Logout disables writes before removing account-scoped storage. Do not
			// recreate a cache while that cleanup is in progress.
			if (gpaCacheWritesDisabled) return;
			await AsyncStorage.setItem(cacheKey(uid), JSON.stringify(createGpaCacheSnapshot(snapshot)));
		} catch {
			// Cache failures must never affect the Firestore-backed data flow.
		}
	});
	pendingWrites.set(uid, write);
	try {
		await write;
	} finally {
		if (pendingWrites.get(uid) === write) pendingWrites.delete(uid);
	}
}

export async function clearGpaCache(uid: string): Promise<void> {
	await pendingWrites.get(uid)?.catch(() => {});
	await AsyncStorage.removeItem(cacheKey(uid)).catch(() => {});
}
