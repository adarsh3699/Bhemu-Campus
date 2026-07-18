const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!;
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

interface FirestoreValue {
	stringValue?: string;
	integerValue?: string;
	doubleValue?: number;
	booleanValue?: boolean;
	nullValue?: null;
	timestampValue?: string;
}

interface FirestoreDoc {
	fields?: Record<string, FirestoreValue>;
}

function extractField(fields: Record<string, FirestoreValue>, key: string): string | number | boolean | null {
	const v = fields[key];
	if (!v) return null;
	if (v.stringValue !== undefined) return v.stringValue;
	if (v.doubleValue !== undefined) return v.doubleValue;
	if (v.integerValue !== undefined) return parseFloat(v.integerValue);
	if (v.booleanValue !== undefined) return v.booleanValue;
	return null;
}

export interface LeaderboardEntryPublic {
	id: string;
	userId: string;
	profileId: string;
	name: string;
	vid: string;
	programCode: string;
	programName: string;
	branch: string | null;
	batchYear: string;
	cgpa: number;
	groupKey: string;
	optOut: boolean;
	rank: number;
	totalStudents: number;
}

type AggFilter =
	| { fieldFilter: { field: { fieldPath: string }; op: string; value: { stringValue?: string; doubleValue?: number; booleanValue?: boolean } } };

async function runAggregationCount(filters: AggFilter[]): Promise<number> {
	const body = {
		structuredAggregationQuery: {
			structuredQuery: {
				from: [{ collectionId: "leaderboard" }],
				where: { compositeFilter: { op: "AND", filters } },
			},
			aggregations: [{ alias: "count", count: {} }],
		},
	};
	const res = await fetch(`${FIRESTORE_BASE}:runAggregationQuery`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
		next: { revalidate: 300 },
	});
	if (!res.ok) return 0;
	const results = await res.json();
	const first = Array.isArray(results) ? results[0] : null;
	return parseInt(first?.result?.aggregateFields?.count?.integerValue ?? "0", 10);
}

export async function fetchLeaderboardEntry(docId: string): Promise<LeaderboardEntryPublic | null> {
	try {
		const res = await fetch(`${FIRESTORE_BASE}/leaderboard/${encodeURIComponent(docId)}`, {
			next: { revalidate: 300 },
		});
		if (!res.ok) return null;

		const document: FirestoreDoc = await res.json();
		if (!document.fields) return null;

		const f = document.fields;
		const optOut = extractField(f, "optOut") as boolean ?? false;
		if (optOut) return null; // respect opt-out for public rank pages

		const cgpa = extractField(f, "cgpa") as number;
		const groupKey = extractField(f, "groupKey") as string;

		const groupFilter: AggFilter[] = [
			{ fieldFilter: { field: { fieldPath: "groupKey" }, op: "EQUAL", value: { stringValue: groupKey } } },
			{ fieldFilter: { field: { fieldPath: "optOut" }, op: "EQUAL", value: { booleanValue: false } } },
		];

		const [aboveCount, totalStudents] = await Promise.all([
			runAggregationCount([
				...groupFilter,
				{ fieldFilter: { field: { fieldPath: "cgpa" }, op: "GREATER_THAN", value: { doubleValue: cgpa } } },
			]),
			runAggregationCount(groupFilter),
		]);

		return {
			id: docId,
			userId: extractField(f, "userId") as string,
			profileId: extractField(f, "profileId") as string,
			name: extractField(f, "name") as string,
			vid: (extractField(f, "vid") as string) ?? "",
			programCode: extractField(f, "programCode") as string,
			programName: extractField(f, "programName") as string,
			branch: extractField(f, "branch") as string | null,
			batchYear: extractField(f, "batchYear") as string,
			cgpa,
			groupKey,
			optOut,
			rank: aboveCount + 1,
			totalStudents,
		};
	} catch {
		return null;
	}
}
