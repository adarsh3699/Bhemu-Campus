import {
	collection,
	doc,
	getDoc,
	getDocs,
	limit,
	orderBy,
	query,
	serverTimestamp,
	updateDoc,
	where,
	type DocumentData,
	type QueryDocumentSnapshot,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import type { UserRole } from "@bhemu/firebase";
import { db } from "@/firebase/config";

export interface AdminUserRecord {
	uid: string;
	email: string | null;
	displayName: string;
	username: string | null;
	photoURL: string | null;
	role: UserRole;
	createdAt: string | null;
	lastLoginAt: string | null;
}

export interface AdminUsersResult {
	users: AdminUserRecord[];
	hasMore: boolean;
}

const PAGE_SIZE = 50;
let allUsersPromise: Promise<AdminUserRecord[]> | null = null;

function asString(value: unknown): string | null {
	return typeof value === "string" && value.trim() ? value : null;
}

function asRole(value: unknown): UserRole {
	return value === "admin" || value === "moderator" || value === "student" ? value : "student";
}

function asIso(value: unknown): string | null {
	if (!value || typeof value !== "object" || !("toDate" in value)) return null;
	const date = (value as { toDate: () => Date }).toDate();
	return date.toISOString();
}

function mapUser(snapshot: QueryDocumentSnapshot<DocumentData>): AdminUserRecord {
	const data = snapshot.data();
	return {
		uid: snapshot.id,
		email: asString(data.email),
		displayName: asString(data.displayName) ?? asString(data.email)?.split("@")[0] ?? "User",
		username: asString(data.username),
		photoURL: asString(data.photoURL),
		role: asRole(data.role),
		createdAt: asIso(data.createdAt),
		lastLoginAt: asIso(data.lastLoginAt),
	};
}

function sortUsers(users: AdminUserRecord[]): AdminUserRecord[] {
	return users.sort((a, b) => {
		const aTime = new Date(a.lastLoginAt ?? a.createdAt ?? 0).getTime();
		const bTime = new Date(b.lastLoginAt ?? b.createdAt ?? 0).getTime();
		return bTime - aTime;
	});
}

async function loadPrefixMatches(field: "email" | "displayName", value: string) {
	const users = collection(db, "users");
	const prefixEnd = `${value}\uf8ff`;
	const result = await getDocs(
		query(
			users,
			where(field, ">=", value),
			where(field, "<=", prefixEnd),
			orderBy(field),
			limit(PAGE_SIZE + 1),
		),
	);
	return result.docs.map(mapUser);
}

function matchesSearch(user: AdminUserRecord, normalized: string): boolean {
	return [user.uid, user.email, user.displayName, user.username]
		.filter((value): value is string => Boolean(value))
		.some((value) => value.toLowerCase().includes(normalized));
}

async function loadLegacyMatches(normalized: string): Promise<AdminUserRecord[]> {
	// Names are stored with their original casing, so this fallback provides
	// case-insensitive search without adding another display-name field.
	if (!allUsersPromise) {
		allUsersPromise = getDocs(collection(db, "users"))
			.then((result) => result.docs.map(mapUser))
			.catch((error) => {
				allUsersPromise = null;
				throw error;
			});
	}
	const users = await allUsersPromise;
	return users.filter((user) => matchesSearch(user, normalized));
}

function updateCachedUser(updatedUser: AdminUserRecord) {
	if (allUsersPromise) {
		allUsersPromise = allUsersPromise.then((users) =>
			users.map((user) => user.uid === updatedUser.uid ? updatedUser : user),
		);
	}
}

export async function listAdminUsers(searchText: string): Promise<AdminUsersResult> {
	const normalized = searchText.trim().toLowerCase();

	if (!normalized) {
		const result = await getDocs(
			query(collection(db, "users"), orderBy("createdAt", "desc"), limit(PAGE_SIZE + 1)),
		);
		return {
			users: result.docs.slice(0, PAGE_SIZE).map(mapUser),
			hasMore: result.docs.length > PAGE_SIZE,
		};
	}

	const rawSearch = searchText.trim();
	const searches = [
		loadPrefixMatches("email", normalized),
		loadPrefixMatches("displayName", rawSearch),
	];
	const results = await Promise.allSettled(searches);
	const uniqueUsers = new Map<string, AdminUserRecord>();
	for (const result of results) {
		if (result.status === "fulfilled") {
			for (const user of result.value) uniqueUsers.set(user.uid, user);
		}
	}
	const displayNameMatches = results[1];
	const needsCaseInsensitiveNameFallback =
		!rawSearch.includes("@") &&
		(displayNameMatches.status === "rejected" || displayNameMatches.value.length === 0);
	if (needsCaseInsensitiveNameFallback) {
		for (const user of await loadLegacyMatches(normalized)) uniqueUsers.set(user.uid, user);
	}
	const users = sortUsers([...uniqueUsers.values()]);
	return { users: users.slice(0, PAGE_SIZE), hasMore: users.length > PAGE_SIZE };
}

export async function changeUserRole(
	actor: User,
	target: AdminUserRecord,
	role: Exclude<UserRole, "admin">,
): Promise<AdminUserRecord> {
	if (target.uid === actor.uid) throw new Error("You cannot change your own role.");
	if (target.role === "admin") throw new Error("Admin roles cannot be changed here.");
	if (role !== "student" && role !== "moderator") throw new Error("Only student and moderator roles are allowed.");

	await updateDoc(doc(db, "users", target.uid), {
		role,
		roleUpdatedBy: actor.uid,
		roleUpdatedAt: serverTimestamp(),
		updatedAt: serverTimestamp(),
	});

	const updated = await getDoc(doc(db, "users", target.uid));
	if (!updated.exists()) throw new Error("User profile no longer exists.");
	const updatedUser = mapUser(updated as QueryDocumentSnapshot<DocumentData>);
	updateCachedUser(updatedUser);
	return updatedUser;
}
