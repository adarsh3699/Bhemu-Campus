// ============================================================
// bCampus Chat Worker — Global Error Handler Middleware
// ============================================================

import type { ErrorHandler } from "hono";
import { AppError } from "../../lib/errors";
import { logger } from "../../lib/logger";
import type { Env } from "../../types";

export const globalErrorHandler: ErrorHandler<{ Bindings: Env }> = (err, c) => {
	if (err instanceof AppError) {
		return c.json(
			{ success: false, error: { code: err.code, message: err.message } },
			err.httpStatus as 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500,
		);
	}

	logger.error("Unhandled error", { message: String(err) });
	return c.json(
		{ success: false, error: { code: "INTERNAL_ERROR", message: "An internal error occurred." } },
		500,
	);
};
