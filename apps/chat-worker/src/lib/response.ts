// ============================================================
// bCampus Chat Worker — Standard HTTP Response Helpers
// ============================================================
// Every endpoint must use these helpers (FRD §5.4)

import type { Context } from "hono";
import { AppError } from "./errors";

export interface SuccessResponse<T> {
	success: true;
	data: T;
}

export interface ErrorResponse {
	success: false;
	error: {
		code: string;
		message: string;
	};
}

export function ok<T>(c: Context, data: T, status: 200 | 201 = 200) {
	return c.json({ success: true, data } satisfies SuccessResponse<T>, status);
}

export function noContent(c: Context) {
	return c.body(null, 204);
}

export function errorResponse(c: Context, err: unknown) {
	if (err instanceof AppError) {
		return c.json(
			{
				success: false,
				error: { code: err.code, message: err.message },
			} satisfies ErrorResponse,
			err.httpStatus as 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500,
		);
	}

	// Unknown / unexpected error — never expose internals
	console.error("[unhandled]", err);
	return c.json(
		{
			success: false,
			error: { code: "INTERNAL_ERROR", message: "An internal error occurred." },
		} satisfies ErrorResponse,
		500,
	);
}
