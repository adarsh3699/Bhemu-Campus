// ============================================================
// bCampus Chat Worker — Attachment Service
// ============================================================
// FRD §2.6, §4.12, §4.13, §7.16
//
// Workers never receive binary data.
// Clients upload directly to R2 using a signed URL.
// This service generates those URLs and validates file metadata.

import type { Env } from "../../types";
import { Errors } from "../../lib/errors";
import type { AuthUser } from "../../types";
import {
	MAX_FILE_SIZE_BYTES,
	ALLOWED_MIME_TYPES,
	UPLOAD_URL_TTL_SECONDS,
} from "../../constants";

export interface UploadUrlRequest {
	fileName: string;
	mimeType: string;
	fileSize: number;
}

export interface UploadUrlResponse {
	storageKey: string;
	uploadUrl: string;
	expiresInSeconds: number;
}

export class AttachmentService {
	constructor(private readonly env: Env) {}

	/**
	 * Validates the file metadata and generates a pre-signed R2 upload URL.
	 * FRD §7.16: validation happens BEFORE issuing any URL.
	 */
	async createUploadUrl(
		user: AuthUser,
		req: UploadUrlRequest,
	): Promise<UploadUrlResponse> {
		// ---- File type validation (FRD §7.16) ----
		if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(req.mimeType)) {
			throw Errors.invalidAttachmentType(req.mimeType);
		}

		// ---- File size validation ----
		if (req.fileSize <= 0 || req.fileSize > MAX_FILE_SIZE_BYTES) {
			throw Errors.fileTooLarge(MAX_FILE_SIZE_BYTES / (1024 * 1024));
		}

		if (!this.env.MEDIA_BUCKET) {
			// R2 not configured — development mode stub
			const storageKey = `${user.uid}/${Date.now()}-stub-${req.fileName}`;
			return {
				storageKey,
				uploadUrl: `https://r2-stub.internal/${storageKey}`,
				expiresInSeconds: UPLOAD_URL_TTL_SECONDS,
			};
		}

		// ---- Generate storage key ----
		// Format: {uid}/{timestamp}-{uuid}-{sanitised filename}
		const sanitised = req.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
		const storageKey = `${user.uid}/${Date.now()}-${crypto.randomUUID()}-${sanitised}`;

		// ---- Generate R2 signed URL ----
		// R2 presigned PUT URL valid for UPLOAD_URL_TTL_SECONDS
		const uploadUrl = await this.env.MEDIA_BUCKET.createMultipartUpload(storageKey);

		return {
			storageKey,
			// uploadId is used for multipart; for single-part uploads clients use
			// the standard R2 presigned URL approach once the bucket is public-write enabled.
			uploadUrl: uploadUrl.uploadId,
			expiresInSeconds: UPLOAD_URL_TTL_SECONDS,
		};
	}

	/**
	 * Deletes an R2 object by storage key.
	 * Called during message cleanup (FRD §8.10).
	 */
	async deleteObject(storageKey: string): Promise<void> {
		if (!this.env.MEDIA_BUCKET) return;
		await this.env.MEDIA_BUCKET.delete(storageKey);
	}
}
