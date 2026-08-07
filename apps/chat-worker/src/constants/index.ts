// ============================================================
// bCampus Chat Worker — Shared Constants
// ============================================================

import { MAX_CHAT_ATTACHMENTS_PER_MESSAGE, MAX_CHAT_MESSAGE_LENGTH } from "@bhemu/shared";

// Pagination
export const MESSAGE_PAGE_SIZE = 50;

// Attachments
export const MAX_ATTACHMENTS_PER_MESSAGE = MAX_CHAT_ATTACHMENTS_PER_MESSAGE;
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
export const MAX_MESSAGE_LENGTH = MAX_CHAT_MESSAGE_LENGTH;
export const MAX_POLL_OPTIONS = 8;
export const MIN_POLL_OPTIONS = 2;

// Spam detection
export const SPAM_WINDOW_MS = 10_000; // 10 seconds
export const SPAM_MAX_IDENTICAL = 3;

// Reports
export const REPORT_AUTO_FLAG_THRESHOLD = 10; // unique reports in 24h
export const REPORT_WINDOW_HOURS = 24;

// Cleanup
export const CLEANUP_BATCH_SIZE = 1000;

// WebSocket
export const HEARTBEAT_INTERVAL_MS = 30_000;
export const HEARTBEAT_TIMEOUT_MS = 90_000;

// Signed URL expiry
export const UPLOAD_URL_TTL_SECONDS = 300; // 5 minutes

// Firebase
export const FIREBASE_JWKS_URL =
	"https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
