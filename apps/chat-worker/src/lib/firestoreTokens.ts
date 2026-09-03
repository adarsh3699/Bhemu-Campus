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

export async function getFcmTokensForUser(uid: string, env: Env): Promise<string[]> {
	const projectId = env.FIREBASE_PROJECT_ID;
	const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`;

	try {
		const accessToken = await getAccessToken(env, [DATASTORE_SCOPE]);
		const res = await fetch(url, {
			method: "GET",
			headers: {
				"Authorization": `Bearer ${accessToken}`,
			}
		});

		if (!res.ok) {
			if (res.status === 404) return []; // User doesn't exist
			const text = await res.text();
			throw new Error(`Firestore read failed: ${res.status} ${text}`);
		}

		const result = await res.json() as FirestoreDocument;
		const data = parseFirestoreDocument(result);
		
		if (Array.isArray(data.fcmTokens)) {
			return data.fcmTokens as string[];
		}
		return [];

	} catch (error) {
		logger.error("firestore.user_read_failed", { uid, error: String(error) });
		return [];
	}
}

/**
 * Returns all FCM tokens in a given room (University or Batchmate).
 * Queries the "users" collection for matching currentGroupKey.
 */
export async function getFcmTokensForRoom(roomType: string, groupKey: string | null, env: Env): Promise<string[]> {
	const projectId = env.FIREBASE_PROJECT_ID;
	const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
	
	try {
		const accessToken = await getAccessToken(env, [DATASTORE_SCOPE]);
		
		let whereClause = undefined;
		
		// If batchmate, filter by currentGroupKey. If university, get all.
		if (roomType === "BATCHMATE") {
			if (!groupKey) return []; // Invalid state, abort.
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
			body: JSON.stringify({
				structuredQuery: {
					from: [{ collectionId: "users" }],
					...(whereClause ? { where: whereClause } : {})
				}
			})
		});

		if (!res.ok) {
			const text = await res.text();
			throw new Error(`Firestore query failed: ${res.status} ${text}`);
		}

		const results = await res.json() as RunQueryResponse[];
		const tokens: string[] = [];
		
		for (const result of results) {
			if (result.document) {
				const data = parseFirestoreDocument(result.document);
				if (Array.isArray(data.fcmTokens)) {
					tokens.push(...(data.fcmTokens as string[]));
				}
			}
		}
		
		return tokens;
	} catch (error) {
		logger.error("firestore.room_read_failed", { roomType, groupKey, error: String(error) });
		return [];
	}
}
