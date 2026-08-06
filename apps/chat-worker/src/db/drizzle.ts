// ============================================================
// bCampus Chat Worker — Drizzle / Neon connection factory
// ============================================================
// Neon serverless driver works inside Cloudflare Workers via HTTP.
// One db instance per request is fine — no persistent pool needed.
//
// NOTE: neon-http supports transactions via .transaction() — each
// statement in the callback is batched in a single HTTP call to
// Neon's HTTP transaction API.

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export type Database = NeonHttpDatabase<typeof schema>;

/**
 * Creates a Drizzle database client bound to the Worker's DATABASE_URL.
 * Call once per request handler; do not cache across requests.
 */
export function createDb(databaseUrl: string): Database {
	const sql = neon(databaseUrl);
	return drizzle(sql, { schema });
}
