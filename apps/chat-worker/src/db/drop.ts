import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import { join } from "path";

dotenv.config({ path: join(process.cwd(), ".env") });

const sql = neon(process.env.DATABASE_URL!);

async function dropAll() {
	console.log("Dropping all tables and types...");
	await sql`DROP SCHEMA public CASCADE;`;
	await sql`CREATE SCHEMA public;`;
	await sql`GRANT ALL ON SCHEMA public TO public;`;
	console.log("Dropped!");
	process.exit(0);
}

dropAll().catch(console.error);
