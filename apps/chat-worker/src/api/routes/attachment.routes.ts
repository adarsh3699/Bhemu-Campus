// ============================================================
// bCampus Chat Worker — Attachment Routes
// POST /api/v1/attachments/upload-url
// ============================================================
// FRD §2.6, §4.12, §5.7, §7.16
// Workers never receive binary data — clients upload directly to R2.

import { Hono } from "hono";
import type { Env } from "../../types";
import { authMiddleware } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validate";
import { UploadUrlRequestSchema } from "../validators/attachment.validator";
import { AttachmentService } from "../../chat/attachments/attachment.service";
import { ok, errorResponse } from "../../lib/response";

const router = new Hono<{ Bindings: Env }>();
router.use("*", authMiddleware);

router.post("/upload-url", async (c) => {
	try {
		const body = validateBody(UploadUrlRequestSchema, await c.req.json());
		const user = c.get("user");
		const result = await new AttachmentService(c.env).createUploadUrl(user, {
			fileName: body.fileName,
			mimeType: body.mimeType,
			fileSize: body.fileSize,
		});
		return ok(c, result, 201);
	} catch (err) {
		return errorResponse(c, err);
	}
});

export { router as attachmentRoutes };
