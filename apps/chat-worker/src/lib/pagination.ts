// ============================================================
// bCampus Chat Worker — Cursor Pagination
// ============================================================
// Cursor format: base64( createdAt ISO + ":" + id )
// OFFSET pagination is explicitly prohibited per FRD §4.23

export interface CursorPayload {
	createdAt: string;
	id: string;
}

export interface PaginatedResult<T> {
	items: T[];
	nextCursor: string | null;
	hasMore: boolean;
}

export function encodeCursor(createdAt: string, id: string): string {
	// Encode as "id|createdAt" — "|" never appears in UUIDs or ISO timestamps
	return btoa(`${id}|${createdAt}`);
}

export function decodeCursor(cursor: string): CursorPayload {
	try {
		const decoded = atob(cursor);
		const pipeIdx = decoded.indexOf("|");
		if (pipeIdx === -1) throw new Error("Invalid cursor");
		return {
			id: decoded.slice(0, pipeIdx),
			createdAt: decoded.slice(pipeIdx + 1),
		};
	} catch {
		throw new Error("Invalid pagination cursor.");
	}
}

export function buildPaginatedResult<T extends { createdAt: string; id: string }>(
	items: T[],
	limit: number,
): PaginatedResult<T> {
	const hasMore = items.length > limit;
	const page = hasMore ? items.slice(0, limit) : items;
	const last = page[page.length - 1];
	const nextCursor = hasMore && last ? encodeCursor(last.createdAt, last.id) : null;

	return { items: page, nextCursor, hasMore };
}
