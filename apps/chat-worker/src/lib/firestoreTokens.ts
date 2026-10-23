// ============================================================
// bCampus Chat Worker — Firestore Token Reader
// ============================================================
// Reads FCM tokens from Firestore via the REST API.
// Does not use the Firebase Admin SDK.

import type { Env } from "../types";
import { logger } from "./logger";
import { getAccessToken } from "./fcm";

interface FirestoreDocument {
	name: string;
	fields: Record<string, FirestoreValue>;
	createTime: string;
	updateTime: string;
}

interface FirestoreValue {
	stringValue?: string;
	integerValue?: string;
	booleanValue?: boolean;
	arrayValue?: {
		values?: FirestoreValue[];
	};
}

interface RunQueryResponse {
	document?: FirestoreDocument;
	readTime: string;
}

const DATASTORE_SCOPE = "https://www.googleapis.com/auth/datastore";

function parseFirestoreValue(value: FirestoreValue): unknown {
	if (value.stringValue !== undefined) return value.stringValue;
	if (value.integerValue !== undefined) return parseInt(value.integerValue, 10);
	if (value.booleanValue !== undefined) return value.booleanValue;
	if (value.arrayValue !== undefined) {
		if (!value.arrayValue.values) return [];
		return value.arrayValue.values.map(parseFirestoreValue);
	}
	return undefined;
}

/**
 * Parses a Firestore REST API Document into a standard JS object.
 */
function parseFirestoreDocument(doc: FirestoreDocument): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	if (!doc.fields) return result;
	
	for (const [key, value] of Object.entries(doc.fields)) {
		result[key] = parseFirestoreValue(value);
	}
	return result;
}

function normalizeFcmTokens(value: unknown): string[] {
	if (!Array.isArray(value)) return [];

	return [
		...new Set(
			value
				.filter((token): token is string => typeof token === "string")
				.map((token) => token.trim())
				.filter(Boolean),
		),
	];
}

/**
 * Firestore REST `runQuery` returns a response stream: one JSON object per
 * line. Some emulators/proxies return a JSON array instead, so accept both
 * shapes without turning a valid query into an empty recipient list.
 */
function parseRunQueryResponses(raw: string): RunQueryResponse[] {
	const trimmed = raw.trim();
	if (!trimmed) return [];

	try {
		const parsed: unknown = JSON.parse(trimmed);
		if (Array.isArray(parsed)) return parsed as RunQueryResponse[];
		if (parsed && typeof parsed === "object") return [parsed as RunQueryResponse];
	} catch {
		// The production REST API uses newline-delimited JSON objects.
	}

	const responses: RunQueryResponse[] = [];
	for (const line of trimmed.split(/\r?\n/)) {
		const value = line.trim();
		if (!value) continue;
		try {
			const parsed: unknown = JSON.parse(value);
			if (parsed && typeof parsed === "object") responses.push(parsed as RunQueryResponse);
		} catch (error) {
			throw new Error(`Invalid Firestore runQuery response: ${String(error)}`);
		}
	}
	return responses;
}

export async function getFcmTokensForUser(uid: string, env: Env): Promise<string[]> {
	const projectId = env.FIREBASE_PROJECT_ID;
	const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`;

	try {
		const accessToken = await getAccessToken(env, [DATASTORE_SCOPE]);
		const res = await fetch(url, {
			method: "GET",
			headers: {
				"Authorization": `Bearer ${accessToken}`,
			},
			signal: AbortSignal.timeout(10_000),
		});

		if (!res.ok) {
			if (res.status === 404) return []; // User doesn't exist
			const text = await res.text();
			throw new Error(`Firestore read failed: ${res.status} ${text}`);
		}

		const result = await res.json() as FirestoreDocument;
		const data = parseFirestoreDocument(result);
		
		return normalizeFcmTokens(data.fcmTokens);

	} catch (error) {
		logger.error("firestore.user_read_failed", { uid, error: String(error) });
		return [];
	}
}

/**
 * Returns all FCM tokens in a given room (University or Batchmate).
 * Queries the "users" collection for matching currentGroupKey.
 */
export async function getFcmTokensForRoom(
	roomType: string, 
	groupKey: string | null, 
	env: Env,
	onlyAllMessages: boolean = false,
	excludeUid?: string,
): Promise<string[]> {
	const projectId = env.FIREBASE_PROJECT_ID;
	const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
	
	try {
		const accessToken = await getAccessToken(env, [DATASTORE_SCOPE]);
		
		let whereClause = undefined;
		
		// If batchmate, filter by currentGroupKey. If university, get all.
		if (roomType === "BATCHMATE") {
			if (!groupKey) {
				logger.warn("firestore.batchmate_group_missing", { roomType });
				return [];
			}
			whereClause = {
				fieldFilter: {
					field: { fieldPath: "currentGroupKey" },
					op: "EQUAL",
					value: { stringValue: groupKey }
				}
			};
		}
		// For university room, whereClause is undefined (gets all users)

		const res = await fetch(url, {
			method: "POST",
			headers: {
				"Authorization": `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
			signal: AbortSignal.timeout(10_000),
			body: JSON.stringify({
				structuredQuery: {
					from: [{ collectionId: "users" }],
					...(whereClause ? { where: whereClause } : {})
				}
			})
		});

		if (!res.ok) {
			const errorText = await res.text();
			logger.error("firestore.room_query_failed", {
				roomType,
				groupKey,
				status: res.status,
				error: errorText.slice(0, 500),
			});
			return [];
		}

		const resData = parseRunQueryResponses(await res.text());
		
		const allTokens = new Set<string>();
		
		for (const d of resData) {
			if (!d.document) continue;
			const documentUid = d.document.name.split("/").pop();
			if (excludeUid && documentUid === excludeUid) continue;
			const data = parseFirestoreDocument(d.document);
			
			if (onlyAllMessages && data.batchmateAllMessages !== true) {
				continue;
			}

			for (const token of normalizeFcmTokens(data.fcmTokens)) allTokens.add(token);
		}
		
		const tokens = Array.from(allTokens);
		logger.info("firestore.room_tokens_loaded", {
			roomType,
			groupKey,
			onlyAllMessages,
			tokenCount: tokens.length,
		});
		return tokens;
	} catch (error) {
		logger.error("firestore.room_read_failed", { roomType, groupKey, error: String(error) });
		return [];
	}
}
