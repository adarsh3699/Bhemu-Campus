// ============================================================
// bCampus Chat Worker — Worker-level Types
// ============================================================

export type AppRole = "STUDENT" | "MODERATOR" | "ADMIN";
export type ModerationStatus = "active" | "flagged" | "suspended" | "banned";

/** Verified identity attached to every authenticated request. */
export interface AuthUser {
	uid: string;
	email: string | null;
	role: AppRole;
	moderation: {
		status: ModerationStatus;
		expiresAt: string | null;
	};
}

/** Cloudflare Worker environment bindings. */
export interface Env {
	DATABASE_URL: string;
	FIREBASE_PROJECT_ID: string;
	/** HMAC secret used for short-lived chat session tokens. */
	CHAT_SESSION_SECRET: string;
	CHAT_ROOM: DurableObjectNamespace;
	/** Cloudflare R2 bucket for media (optional until R2 binding is added). */
	MEDIA_BUCKET?: R2Bucket;
}
