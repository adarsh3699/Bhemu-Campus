// ============================================================
// bCampus Chat Worker — Drizzle / Neon connection factory
// ============================================================
// Neon serverless driver works inside Cloudflare Workers via HTTP.
// One db instance per request is fine — no persistent pool needed.
//
// Multi-statement writes use the driver's supported db.batch() API at the
// repository boundary. Do not add a generic transaction helper here: the
// neon-http driver does not expose the callback transaction semantics used by
// the old helper.

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
