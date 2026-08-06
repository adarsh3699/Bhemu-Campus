// ============================================================
// bCampus Chat Worker — Shared Constants
// ============================================================

// Pagination
export const MESSAGE_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

// Attachments
export const MAX_ATTACHMENTS_PER_MESSAGE = 5;
export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
export const ALLOWED_MIME_TYPES = [
	"image/jpeg",
	"image/png",
	"image/gif",
	"image/webp",
	"application/pdf",
	"application/msword",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"application/zip",
] as const;

// Messages
export const MAX_MESSAGE_LENGTH = 4000;
export const MAX_POLL_OPTIONS = 8;
export const MIN_POLL_OPTIONS = 2;

// Spam detection
export const SPAM_WINDOW_MS = 10_000; // 10 seconds
export const SPAM_MAX_IDENTICAL = 3;
export const SPAM_SCORE_RESET_HOURS = 24;

// Reports
export const REPORT_AUTO_FLAG_THRESHOLD = 10; // unique reports in 24h
export const REPORT_WINDOW_HOURS = 24;

// Pins
export const DEFAULT_PIN_LIMIT = 5;

// Cleanup
export const CLEANUP_BATCH_SIZE = 500;
export const CLEANUP_CRON_INTERVAL_MINUTES = 60;

// WebSocket
export const HEARTBEAT_INTERVAL_MS = 30_000;
export const HEARTBEAT_TIMEOUT_MS = 90_000;

// Signed URL expiry
export const UPLOAD_URL_TTL_SECONDS = 300; // 5 minutes

// Firebase
export const FIREBASE_JWKS_URL =
	"https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
